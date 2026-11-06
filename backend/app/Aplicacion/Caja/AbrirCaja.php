<?php

declare(strict_types=1);

namespace App\Aplicacion\Caja;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Tpv\Dtos\AbrirCajaDto;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Services\CajaService;
use Illuminate\Support\Facades\DB;

final class AbrirCaja
{
    public function __construct(private readonly CajaService $cajaService) {}

    /** La sucursal es la fila estable que serializa dos aperturas sin sesión previa. */
    public function ejecutar(AbrirCajaDto $dto, Usuario $usuario): CajaSesion
    {
        $operacion = function () use ($dto, $usuario): CajaSesion {
            $sucursal = Sucursal::query()->withoutGlobalScope(TenantScope::class)->whereKey((int) $usuario->getAttribute('sucursal_id'))->lockForUpdate()->firstOrFail();

            return $this->cajaService->abrirCajaConSucursal($sucursal, $usuario->id, $dto->montoApertura);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
