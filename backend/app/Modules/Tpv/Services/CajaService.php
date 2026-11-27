<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Services;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Exceptions\CajaYaAbiertaException;
use App\Modules\Tpv\Exceptions\CajaYaCerradaException;
use App\Modules\Tpv\Exceptions\ConteoMetodoFaltanteException;
use App\Modules\Tpv\Models\CajaCierreMetodo;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\CajaSesionSaldo;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaPago;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;

class CajaService
{
    public function __construct(private readonly LibroCaja $libroCaja) {}

    public function abrirCajaConSucursal(Sucursal $sucursal, int $usuarioId, float $montoApertura, Terminal $terminal, string $fechaOperativa, DateTimeInterface $fechaApertura, ?int $supervisorAperturaId = null): CajaSesion
    {
        $this->exigirTransaccion();
        $yaAbierta = CajaSesion::sinTenant()
            ->where('terminal_id', $terminal->id)
            ->where('estado', 'abierta')
            ->exists();

        if ($yaAbierta) {
            throw new CajaYaAbiertaException($sucursal->id, $terminal->id);
        }

        $caja = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->create([
            'sucursal_id' => $sucursal->id,
            'terminal_id' => $terminal->id,
            'supervisor_apertura_id' => $supervisorAperturaId,
            'usuario_id' => $usuarioId,
            'monto_apertura' => $montoApertura,
            'saldo_teorico' => $montoApertura,
            'estado' => 'abierta',
            'fecha_apertura' => $fechaApertura,
            'fecha_operativa' => $fechaOperativa,
        ]);
        // DAT-05: el primer renglón del libro de caja es la apertura.
        $this->libroCaja->saldoInicial($caja, $usuarioId);

        return $caja;
    }

    /**
     * total_ventas_sistema se calcula SIEMPRE sumando venta_pagos de las
     * ventas de esta sesion (nunca ventas.total directo), para que quede
     * correcto con pago mixto desde el dia uno. Excluye es_venta_sombra=1
     * (como pide el documento) y ademas ventas con estado='anulada' -- no
     * estaba pedido explicitamente, pero es el mismo criterio que ya usa
     * es_venta_sombra en la seccion 3.6 del documento: una venta anulada no
     * es una venta real del dia y contarla inflaria el sistema contra el
     * corte fisico de caja.
     *
     * El desglose de gastos lo obtiene la Action: Tpv no importa el modulo Gastos (se construyo antes y
     * la direccion de dependencia del proyecto va siempre de lo nuevo hacia
     * lo viejo, nunca al reves) -- es el LLAMADOR (GastoService::totalGastos())
     * quien calcula el desglose; el saldo por método sale del libro, mismo patron
     * de separar la orquestación entre módulos de la escritura de dominio.
     *
     * CORRECCION DE FORMULA (cambia el resultado de llamadas previas): antes
     * diferencia = montoFisico - totalVentasSistema, que ignoraba por
     * completo monto_apertura -- un error real (si abres con $500 de fondo
     * y vendes $50, el cajon deberia tener ~$550, no $50). Se corrige al
     * total_teorico del documento original de POS Ropa: apertura + ventas -
     * gastos. DAT-04b aplica esa suma por método con los demás movimientos monetarios;
     * el encabezado suma los conteos y teóricos, nunca compara solo efectivo con tarjetas.
     */
    /** @param list<array{metodo_pago_id:int,monto:int|float|string}> $conteos */
    public function cerrarCajaConSesion(CajaSesion $cajaSesion, array $conteos, ?string $folio = null, ?int $usuarioCierreId = null): CajaSesion
    {
        $this->exigirTransaccion();
        if ($cajaSesion->getAttribute('estado') === 'cerrada') {
            throw new CajaYaCerradaException((int) $cajaSesion->id);
        }
        $this->libroCaja->saldoInicial($cajaSesion, (int) $cajaSesion->getAttribute('usuario_id'));
        $saldos = CajaSesionSaldo::query()->where('caja_sesion_id', $cajaSesion->id)->get()->keyBy('metodo_pago_id');
        $contados = [];
        foreach ($conteos as $conteo) {
            $id = $conteo['metodo_pago_id'];
            if (isset($contados[$id])) {
                throw new \InvalidArgumentException('No se puede repetir un método de pago en el cierre.');
            }
            $monto = Dinero::desde((string) $conteo['monto']);
            if ($monto->comparar(Dinero::desde('0')) < 0) {
                throw new \InvalidArgumentException('El monto contado no puede ser negativo.');
            }
            $contados[$id] = $monto;
        }
        foreach ($saldos as $id => $saldo) {
            if (! isset($contados[$id])) {
                throw new ConteoMetodoFaltanteException((int) $cajaSesion->id, (int) $id);
            }
        }
        $teoricoTotal = Dinero::desde('0');
        $contadoTotal = Dinero::desde('0');
        foreach ($contados as $id => $contado) {
            $teorico = Dinero::desde(isset($saldos[$id]) ? (string) $saldos[$id]->getAttribute('saldo_teorico') : '0.00');
            CajaCierreMetodo::query()->create(['caja_sesion_id' => $cajaSesion->id, 'metodo_pago_id' => $id, 'total_teorico' => $teorico->aCadena(), 'monto_contado' => $contado->aCadena(), 'diferencia' => $contado->restar($teorico)->aCadena()]);
            $teoricoTotal = $teoricoTotal->sumar($teorico);
            $contadoTotal = $contadoTotal->sumar($contado);
        }
        $cajaSesion->update(['folio' => $folio, 'usuario_cierre_id' => $usuarioCierreId, 'monto_cierre' => $contadoTotal->aCadena(), 'total_teorico' => $teoricoTotal->aCadena(), 'total_ventas_sistema' => $this->totalVentasSistema($cajaSesion), 'diferencia' => $contadoTotal->restar($teoricoTotal)->aCadena(), 'fecha_cierre' => now(), 'estado' => 'cerrada']);

        return $cajaSesion->refresh()->load('cierreMetodos.metodoPago');
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('CajaService requiere una transacción abierta por una Action.');
        }
    }

    /**
     * Vista en vivo de "ventas de la sesion, total acumulado" mientras la
     * caja sigue abierta -- misma formula/exclusiones que cerrarCajaConSesion()
     * (sin venta_sombra, sin anuladas), pero sin escribir nada. La usa la
     * pantalla de caja para mostrar el estado actual antes del corte.
     *
     * @return array{ventas_count: int, total_ventas: float}
     */
    public function resumenSesion(CajaSesion $cajaSesion): array
    {
        $ventasValidas = Venta::where('caja_sesion_id', $cajaSesion->id)
            ->where('es_venta_sombra', false)
            ->where('estado', '!=', 'anulada');

        return [
            'ventas_count' => (clone $ventasValidas)->count(),
            'total_ventas' => $this->totalVentasSistema($cajaSesion),
        ];
    }

    private function totalVentasSistema(CajaSesion $cajaSesion): float
    {
        return round((float) VentaPago::sinTenant()
            ->whereHas('venta', function ($query) use ($cajaSesion) {
                $query->where('caja_sesion_id', $cajaSesion->id)
                    ->where('es_venta_sombra', false)
                    ->where('estado', '!=', 'anulada');
            })
            ->sum('monto'), 2);
    }
}
