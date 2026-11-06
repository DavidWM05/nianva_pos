<?php

declare(strict_types=1);

namespace App\Aplicacion\UnidadesMedida;

use App\Modules\UnidadesMedida\Dtos\UnidadMedidaDto;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use App\Modules\UnidadesMedida\Services\UnidadMedidaService;
use Illuminate\Support\Facades\DB;

final class CrearUnidadMedida
{
    public function __construct(private readonly UnidadMedidaService $service) {}

    public function ejecutar(UnidadMedidaDto $dto, int $tenantId): UnidadMedida
    {
        $operacion = function () use ($dto, $tenantId) {
            $datos = $dto->datosPresentes();
            $datos['tenant_id'] = $tenantId;

            return $this->service->crear($datos);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
