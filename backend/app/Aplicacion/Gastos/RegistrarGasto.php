<?php

declare(strict_types=1);

namespace App\Aplicacion\Gastos;

use App\Modules\Gastos\Dtos\CrearGastoDto;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Gastos\Services\GastoService;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;

final class RegistrarGasto
{
    public function __construct(private readonly GastoService $service) {}

    /** Usa la caja del contexto y participa de la transacción de la Action llamadora. */
    public function ejecutar(CrearGastoDto $dto, Usuario $usuario): Gasto
    {
        $operacion = function () use ($dto, $usuario): Gasto {
            $sucursalId = (int) $usuario->getAttribute('sucursal_id');
            $caja = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', $sucursalId)->where('estado', 'abierta')->latest('id')->lockForUpdate()->first();

            return $this->service->registrarGastoConCaja($caja, $sucursalId, $usuario->id, $dto->descripcion, $dto->monto);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
