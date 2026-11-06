<?php

declare(strict_types=1);

namespace App\Aplicacion\Produccion;

use App\Modules\Produccion\Dtos\CrearRecetaDto;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Services\ProduccionService;
use Illuminate\Support\Facades\DB;

final class CrearReceta
{
    public function __construct(private readonly ProduccionService $service) {}

    public function ejecutar(CrearRecetaDto $dto, int $tenantId): Receta
    {
        $operacion = function () use ($dto, $tenantId) {
            $datos = $dto->datos();
            $datos['tenant_id'] = $tenantId;

            return $this->service->crearReceta($datos);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
