<?php

declare(strict_types=1);

namespace App\Aplicacion\Produccion;

use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Produccion\Dtos\CrearOrdenProduccionDto;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Services\ProduccionService;
use Illuminate\Support\Facades\DB;

final class CrearOrdenProduccion
{
    public function __construct(private readonly ProduccionService $service, private readonly BloqueosProduccion $bloqueos) {}

    public function ejecutar(CrearOrdenProduccionDto $dto, Usuario $usuario): OrdenProduccion
    {
        $operacion = function () use ($dto, $usuario) {
            $receta = $this->bloqueos->receta($dto->recetaId);
            $datos = $dto->datos();
            $datos['tenant_id'] = (int) $usuario->getAttribute('tenant_id');
            $datos['sucursal_id'] = (int) $usuario->getAttribute('sucursal_id');
            $datos['usuario_id'] = $usuario->id;
            $lotes = $this->bloqueos->lotes($receta, $datos['sucursal_id']);

            return $this->service->crearOrdenConReceta($datos, $receta, $lotes);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
