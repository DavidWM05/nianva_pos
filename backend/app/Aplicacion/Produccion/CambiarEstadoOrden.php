<?php

declare(strict_types=1);

namespace App\Aplicacion\Produccion;

use App\Modules\Produccion\Dtos\CambiarEstadoOrdenDto;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Services\ProduccionService;
use Illuminate\Support\Facades\DB;

final class CambiarEstadoOrden
{
    public function __construct(private readonly ProduccionService $service, private readonly CompletarOrden $completar) {}

    public function ejecutar(CambiarEstadoOrdenDto $dto, int $id): OrdenProduccion
    {
        $operacion = function () use ($dto, $id) {
            if ($dto->estado === 'completada') {
                return $this->completar->ejecutar($id, (int) $dto->cantidadProducida);
            }
            $orden = OrdenProduccion::query()->whereKey($id)->lockForUpdate()->firstOrFail();

            return $this->service->cambiarEstadoConOrden($orden, $dto->estado);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
