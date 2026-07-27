<?php

namespace App\Modules\Gastos\Services;

use App\Modules\Gastos\Models\Gasto;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para registrar gastos de caja. Mismo criterio que
 * VentaService::registrarVenta(): resuelve la caja abierta de la sucursal
 * (no acepta un caja_sesion_id crudo del llamador) y rechaza si no hay
 * ninguna -- reutiliza la MISMA excepcion de Tpv (CajaSesionNoAbiertaException),
 * porque es exactamente el mismo fallo con la misma causa.
 */
class GastoService
{
    public function registrarGasto(int $sucursalId, int $usuarioId, string $descripcion, float $monto): Gasto
    {
        if (trim($descripcion) === '') {
            throw new InvalidArgumentException('La descripcion del gasto no puede estar vacia.');
        }

        if ($monto <= 0) {
            throw new InvalidArgumentException('El monto del gasto debe ser mayor a cero.');
        }

        return DB::transaction(function () use ($sucursalId, $usuarioId, $descripcion, $monto) {
            $cajaSesion = CajaSesion::sinTenant()
                ->where('sucursal_id', $sucursalId)
                ->where('estado', 'abierta')
                ->latest('id')
                ->first();

            if (! $cajaSesion) {
                throw new CajaSesionNoAbiertaException($sucursalId);
            }

            return Gasto::create([
                'caja_sesion_id' => $cajaSesion->id,
                'sucursal_id' => $sucursalId,
                'usuario_id' => $usuarioId,
                'descripcion' => $descripcion,
                'monto' => round($monto, 2),
            ]);
        });
    }

    /**
     * Suma los gastos de una caja_sesion. El llamador (quien orquesta el
     * cierre de caja) lo pasa como $totalGastos a
     * CajaService::cerrarCaja() -- Tpv no importa Gastos, ver el docblock
     * de cerrarCaja() para el porque.
     */
    public function totalGastos(int $cajaSesionId): float
    {
        return round((float) Gasto::sinTenant()->where('caja_sesion_id', $cajaSesionId)->sum('monto'), 2);
    }
}
