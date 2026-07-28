<?php

namespace App\Modules\CuentasPagar\Services;

use App\Modules\CuentasPagar\Exceptions\CuentaPagarAnuladaException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarConAbonosException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarYaPagadaException;
use App\Modules\CuentasPagar\Exceptions\PagoExcedeSaldoException;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;

/**
 * Unico punto de entrada para gestionar cuentas por pagar y sus pagos.
 */
class CuentasPagarService
{
    public function crearDesdeCompra(\App\Modules\Inventario\Models\Compra $compra, int $diasCredito = 30): CuentaPagar
    {
        return DB::transaction(function () use ($compra, $diasCredito) {
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
        });
    }

    public function registrarPago(int $cuentaId, array $data): AbonoPagar
    {
        return DB::transaction(function () use ($cuentaId, $data) {
            $cuenta = CuentaPagar::where('id', $cuentaId)
                ->lockForUpdate()
                ->firstOrFail();

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

            $cajaSesion = CajaSesion::sinTenant()
                ->where('sucursal_id', $data['sucursal_id'])
                ->where('estado', 'abierta')
                ->latest('id')
                ->first();

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
        });
    }

    public function anular(int $cuentaId): void
    {
        DB::transaction(function () use ($cuentaId) {
            $cuenta = CuentaPagar::where('id', $cuentaId)
                ->lockForUpdate()
                ->firstOrFail();

            $tieneAbonos = AbonoPagar::where('cuenta_pagar_id', $cuentaId)->exists();

            if ($tieneAbonos) {
                throw new CuentaPagarConAbonosException($cuentaId);
            }

            $cuenta->update(['estado' => 'anulada']);
        });
    }
}
