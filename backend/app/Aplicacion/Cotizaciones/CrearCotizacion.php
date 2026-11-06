<?php

declare(strict_types=1);

namespace App\Aplicacion\Cotizaciones;

use App\Modules\Cotizaciones\Dtos\CrearCotizacionDto;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Services\CotizacionService;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Support\Facades\DB;

final class CrearCotizacion
{
    public function __construct(private readonly CotizacionService $service) {}

    public function ejecutar(CrearCotizacionDto $dto, Usuario $usuario): Cotizacion
    {
        $operacion = function () use ($dto, $usuario) {
            Tenant::query()->whereKey((int) $usuario->getAttribute('tenant_id'))->lockForUpdate()->firstOrFail();

            return $this->service->crear(['tenant_id' => (int) $usuario->getAttribute('tenant_id'), 'sucursal_id' => $dto->sucursalId, 'usuario_id' => $usuario->id, 'cliente_id' => $dto->clienteId, 'validez_dias' => $dto->validezDias, 'descuento' => $dto->descuento, 'observaciones' => $dto->observaciones, 'uso_cfdi' => $dto->usoCfdi], $dto->itemsParaServicio());
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
