<?php

declare(strict_types=1);

namespace App\Aplicacion\UnidadesMedida;

use App\Modules\UnidadesMedida\Dtos\UnidadMedidaDto;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use App\Modules\UnidadesMedida\Services\UnidadMedidaService;
use Illuminate\Support\Facades\DB;

final class ActualizarUnidadMedida
{
    public function __construct(private readonly UnidadMedidaService $service) {}

    public function ejecutar(UnidadMedidaDto $dto, int $id): UnidadMedida
    {
        $operacion = function () use ($dto, $id) {
            $unidad = UnidadMedida::query()->whereKey($id)->lockForUpdate()->firstOrFail();

            return $this->service->actualizarConUnidad($unidad, $dto->datosPresentes());
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
