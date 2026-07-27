<?php

namespace App\Modules\Tpv\Services;

use App\Modules\Tpv\Exceptions\CajaYaAbiertaException;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaPago;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CajaService
{
    public function abrirCaja(int $sucursalId, int $usuarioId, float $montoApertura): CajaSesion
    {
        return DB::transaction(function () use ($sucursalId, $usuarioId, $montoApertura) {
            $yaAbierta = CajaSesion::sinTenant()
                ->where('sucursal_id', $sucursalId)
                ->where('estado', 'abierta')
                ->exists();

            if ($yaAbierta) {
                throw new CajaYaAbiertaException($sucursalId);
            }

            return CajaSesion::sinTenant()->create([
                'sucursal_id' => $sucursalId,
                'usuario_id' => $usuarioId,
                'monto_apertura' => $montoApertura,
                'estado' => 'abierta',
                'fecha_apertura' => now(),
            ]);
        });
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
     * $totalGastos: Tpv no importa el modulo Gastos (se construyo antes y
     * la direccion de dependencia del proyecto va siempre de lo nuevo hacia
     * lo viejo, nunca al reves) -- es el LLAMADOR (GastoService::totalGastos())
     * quien calcula el numero y lo entrega ya resuelto aqui, mismo patron
     * que abono_previo en VentaService::registrarVenta(). Default 0.0:
     * cualquier instalacion sin el modulo Gastos sigue funcionando igual.
     *
     * CORRECCION DE FORMULA (cambia el resultado de llamadas previas): antes
     * diferencia = montoFisico - totalVentasSistema, que ignoraba por
     * completo monto_apertura -- un error real (si abres con $500 de fondo
     * y vendes $50, el cajon deberia tener ~$550, no $50). Se corrige al
     * total_teorico del documento original de POS Ropa: apertura + ventas -
     * gastos. Ya no es solo "agregar gastos", es la formula completa.
     */
    public function cerrarCaja(CajaSesion $cajaSesion, float $montoFisico, float $totalGastos = 0.0): CajaSesion
    {
        if ($cajaSesion->estado === 'cerrada') {
            throw new InvalidArgumentException("La caja {$cajaSesion->id} ya esta cerrada.");
        }

        return DB::transaction(function () use ($cajaSesion, $montoFisico, $totalGastos) {
            $totalVentasSistema = $this->totalVentasSistema($cajaSesion);

            $totalTeorico = round((float) $cajaSesion->monto_apertura + $totalVentasSistema - $totalGastos, 2);
            $diferencia = round($montoFisico - $totalTeorico, 2);

            $cajaSesion->update([
                'monto_cierre' => $montoFisico,
                'total_ventas_sistema' => $totalVentasSistema,
                'diferencia' => $diferencia,
                'fecha_cierre' => now(),
                'estado' => 'cerrada',
            ]);

            return $cajaSesion->refresh();
        });
    }

    /**
     * Vista en vivo de "ventas de la sesion, total acumulado" mientras la
     * caja sigue abierta -- misma formula/exclusiones que cerrarCaja()
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
