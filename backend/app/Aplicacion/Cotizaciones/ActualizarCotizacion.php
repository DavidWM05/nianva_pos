<?php

declare(strict_types=1);

namespace App\Aplicacion\Cotizaciones;

use App\Modules\Cotizaciones\Dtos\ActualizarCotizacionDto;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Services\CotizacionService;
use Illuminate\Support\Facades\DB;

final class ActualizarCotizacion
{
    public function __construct(private readonly CotizacionService $service) {}

    public function ejecutar(ActualizarCotizacionDto $dto, int $id): Cotizacion
    {
        $operacion = function () use ($dto, $id) {
            $cotizacion = Cotizacion::query()->whereKey($id)->lockForUpdate()->firstOrFail();

            return $this->service->actualizarConCotizacion($cotizacion, $dto->datosPresentes(), $dto->itemsParaServicio());
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
