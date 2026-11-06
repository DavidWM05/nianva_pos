<?php

declare(strict_types=1);

namespace App\Modules\Gastos\Services;

use App\Modules\Gastos\Models\Gasto;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para registrar gastos de caja. Mismo criterio que
 * RegistrarGasto resuelve y bloquea la caja abierta de la sucursal; el núcleo la recibe
 * (la API no acepta un caja_sesion_id crudo del llamador) y rechaza si no hay
 * ninguna -- reutiliza la MISMA excepcion de Tpv (CajaSesionNoAbiertaException),
 * porque es exactamente el mismo fallo con la misma causa.
 */
class GastoService
{
    public function registrarGastoConCaja(?CajaSesion $cajaSesion, int $sucursalId, int $usuarioId, string $descripcion, float $monto): Gasto
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('GastoService requiere una transacción abierta por una Action.');
        }
        if (trim($descripcion) === '') {
            throw new InvalidArgumentException('La descripcion del gasto no puede estar vacia.');
        }

        if ($monto <= 0) {
            throw new InvalidArgumentException('El monto del gasto debe ser mayor a cero.');
        }

        if (! $cajaSesion || $cajaSesion->getAttribute('estado') !== 'abierta') {
            throw new CajaSesionNoAbiertaException($sucursalId);
        }

        return Gasto::query()->create([
            'caja_sesion_id' => $cajaSesion->id,
            'sucursal_id' => $sucursalId,
            'usuario_id' => $usuarioId,
            'descripcion' => $descripcion,
            'monto' => round($monto, 2),
        ]);
    }

    /**
     * Suma los gastos de una caja_sesion. El llamador (quien orquesta el
     * cierre de caja) lo pasa como $totalGastos a
     * CajaService::cerrarCajaConSesion() -- Tpv no importa Gastos, ver el docblock
     * de cerrarCajaConSesion() para el porque.
     */
    public function totalGastos(int $cajaSesionId): float
    {
        return round((float) Gasto::sinTenant()->where('caja_sesion_id', $cajaSesionId)->sum('monto'), 2);
    }
}
