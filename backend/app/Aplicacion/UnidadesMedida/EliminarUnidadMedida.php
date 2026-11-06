<?php

declare(strict_types=1);

namespace App\Aplicacion\UnidadesMedida;

use App\Modules\UnidadesMedida\Models\UnidadMedida;
use App\Modules\UnidadesMedida\Services\UnidadMedidaService;
use Illuminate\Support\Facades\DB;

final class EliminarUnidadMedida
{
    public function __construct(private readonly UnidadMedidaService $service) {}

    public function ejecutar(int $id): void
    {
        $operacion = function () use ($id) {
            $unidad = UnidadMedida::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $this->service->eliminarConUnidad($unidad);
        };

        if (DB::transactionLevel() > 0) {
            $operacion();
        } else {
            DB::transaction($operacion);
        }
    }
}
