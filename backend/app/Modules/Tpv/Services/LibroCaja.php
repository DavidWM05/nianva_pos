<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Services;

use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Nucleo\Support\Proyeccion;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaMovimiento;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\CajaSesionSaldo;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * DAT-04: único punto de escritura del libro de caja. Cada renglón mueve la proyección
 * por método y su suma caja_sesiones.saldo_teorico en la misma transacción
 * (Proyeccion::actualizar: cero filas = falla). Registra apertura, pagos de venta,
 * anulaciones, gastos, abonos, recargas, pagos CxP y reembolsos monetarios.
 * La Action debe haber bloqueado la sesión: serializa también la creación del saldo por método.
 */
class LibroCaja
{
    public const TIPOS = ['venta', 'anulacion', 'gasto', 'abono_cxc', 'pago_cxp', 'abono_apartado', 'recarga_gc', 'devolucion'];

    public function esMonetario(int $metodoId): bool
    {
        $metodo = MetodoPago::query()->findOrFail($metodoId);

        // Son los dos medios de saldo que ya procesa el TPV aparte; digital también incluye dinero.
        $esMonetario = ! in_array($metodo->getAttribute('nombre'), ['Gift Card', 'Nota de Crédito'], true);

        return $esMonetario;
    }

    /** DAT-05: el primer renglón de una caja es la apertura en efectivo; la suma ya nace con ese monto. */
    public function saldoInicial(CajaSesion $caja, int $usuarioId): CajaMovimiento
    {
        $this->exigirTransaccion();
        $existente = CajaMovimiento::query()->where('caja_sesion_id', $caja->id)->where('tipo', 'saldo_inicial')->orderBy('id')->first();
        if ($existente !== null) {
            return $existente;
        }

        return $this->iniciarMetodo($caja, MetodoEfectivo::id(), Dinero::desde((string) $caja->getAttribute('monto_apertura'))->aCadena(), $usuarioId);
    }

    /** @param string $monto con signo: positivo entra a la caja, negativo sale. */
    public function registrar(CajaSesion $caja, string $tipo, string $monto, string $referenciaTabla, int $referenciaId, int $usuarioId, int $metodoId): CajaMovimiento
    {
        $this->exigirTransaccion();
        if ($caja->getAttribute('estado') !== 'abierta') {
            throw new CajaSesionNoAbiertaException((int) $caja->getAttribute('sucursal_id'));
        }
        if (! in_array($tipo, self::TIPOS, true)) {
            throw new InvalidArgumentException("Tipo de movimiento de caja inválido: {$tipo}");
        }
        $importe = Dinero::desde($monto);
        if ($importe->aCadena() === '0.00') {
            throw new InvalidArgumentException('Un movimiento de caja necesita un monto distinto de cero.');
        }
        if (! CajaSesionSaldo::query()->where('caja_sesion_id', $caja->id)->exists()) {
            $this->saldoInicial($caja, $usuarioId);
        }
        $saldo = CajaSesionSaldo::query()->where('caja_sesion_id', $caja->id)->where('metodo_pago_id', $metodoId)->first();
        if ($saldo === null) {
            $this->iniciarMetodo($caja, $metodoId, '0.00', $usuarioId);
            $saldo = CajaSesionSaldo::query()->where('caja_sesion_id', $caja->id)->where('metodo_pago_id', $metodoId)->firstOrFail();
        }
        $antes = (string) $saldo->getAttribute('saldo_teorico');
        $despues = Dinero::desde($antes)->sumar($importe)->aCadena();
        Proyeccion::actualizar($saldo, 'saldo_teorico', $antes, ['saldo_teorico' => $despues]);
        $totalAntes = (string) $caja->getAttribute('saldo_teorico');
        Proyeccion::actualizar($caja, 'saldo_teorico', $totalAntes, ['saldo_teorico' => Dinero::desde($totalAntes)->sumar($importe)->aCadena()]);

        return CajaMovimiento::query()->create(['caja_sesion_id' => $caja->id, 'metodo_pago_id' => $metodoId, 'tipo' => $tipo, 'referencia_tabla' => $referenciaTabla, 'referencia_id' => $referenciaId, 'monto' => $importe->aCadena(), 'saldo_antes' => $antes, 'saldo_despues' => $despues, 'usuario_id' => $usuarioId]);
    }

    private function iniciarMetodo(CajaSesion $caja, int $metodoId, string $monto, int $usuarioId): CajaMovimiento
    {
        $existente = CajaMovimiento::query()->where('caja_sesion_id', $caja->id)->where('metodo_pago_id', $metodoId)->where('tipo', 'saldo_inicial')->first();
        if ($existente !== null) {
            return $existente;
        }
        CajaSesionSaldo::query()->create(['caja_sesion_id' => $caja->id, 'metodo_pago_id' => $metodoId, 'saldo_teorico' => $monto]);

        return CajaMovimiento::query()->create(['caja_sesion_id' => $caja->id, 'metodo_pago_id' => $metodoId, 'tipo' => 'saldo_inicial', 'monto' => $monto, 'saldo_antes' => '0.00', 'saldo_despues' => $monto, 'usuario_id' => $usuarioId]);
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('LibroCaja requiere una transacción abierta por una Action.');
        }
    }
}
