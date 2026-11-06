<?php

declare(strict_types=1);

namespace App\Modules\CuentasPagar\Services;

use App\Modules\CuentasPagar\Exceptions\CuentaPagarAnuladaException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarConAbonosException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarYaPagadaException;
use App\Modules\CuentasPagar\Exceptions\PagoExcedeSaldoException;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;

/**
 * Unico punto de entrada para gestionar cuentas por pagar y sus pagos.
 */
class CuentasPagarService
{
    public function crearDesdeCompra(Compra $compra, int $diasCredito = 30): CuentaPagar
    {
        $this->exigirTransaccion();

        $fechaVencimiento = now()->addDays($diasCredito)->toDateString();

        return CuentaPagar::create([
            'tenant_id' => $compra->tenant_id,
            'compra_id' => $compra->id,
            'proveedor_id' => $compra->proveedor_id,
            'monto_total' => $compra->total,
            'saldo_pendiente' => $compra->total,
            'fecha_vencimiento' => $fechaVencimiento,
            'estado' => 'pendiente',
        ]);

    }

    /** @param array<string, mixed> $data */
    public function registrarPagoConBloqueos(CuentaPagar $cuenta, array $data, ?CajaSesion $cajaSesion): AbonoPagar
    {
        $this->exigirTransaccion();

        $cuentaId = (int) $cuenta->getKey();

        if ($cuenta->estado === 'pagada') {
            throw new CuentaPagarYaPagadaException($cuentaId);
        }

        if ($cuenta->estado === 'anulada') {
            throw new CuentaPagarAnuladaException($cuentaId);
        }

        $monto = round((float) ($data['monto']), 2);

        if ($monto > (float) $cuenta->saldo_pendiente) {
            throw new PagoExcedeSaldoException((float) $cuenta->saldo_pendiente, $monto);
        }

        if (! $cajaSesion) {
            throw new CajaSesionNoAbiertaException($data['sucursal_id']);
        }

        $abono = AbonoPagar::create([
            'cuenta_pagar_id' => $cuenta->id,
            'caja_sesion_id' => $cajaSesion->id,
            'usuario_id' => $data['usuario_id'],
            'monto' => $monto,
            'metodo_pago_id' => $data['metodo_pago_id'],
            'referencia' => $data['referencia'] ?? null,
        ]);

        $nuevoSaldo = round((float) $cuenta->saldo_pendiente - $monto, 2);
        $cuenta->update([
            'saldo_pendiente' => $nuevoSaldo,
            'estado' => $nuevoSaldo <= 0 ? 'pagada' : 'pendiente',
        ]);

        return $abono;

    }

    public function anularConCuenta(CuentaPagar $cuenta): void
    {
        $this->exigirTransaccion();

        $cuentaId = (int) $cuenta->getKey();

        $tieneAbonos = AbonoPagar::where('cuenta_pagar_id', $cuentaId)->exists();

        if ($tieneAbonos) {
            throw new CuentaPagarConAbonosException($cuentaId);
        }

        $cuenta->update(['estado' => 'anulada']);

    }

    /** El modelo recibido debe haberse leído con bloqueo en la Action llamadora. */
    private function exigirTransaccion(): void
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('La escritura de saldos requiere una transacción activa.');
        }
    }
}
