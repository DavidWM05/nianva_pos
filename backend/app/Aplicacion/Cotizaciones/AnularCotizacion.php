<?php

declare(strict_types=1);

namespace App\Aplicacion\Cotizaciones;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Services\CotizacionService;
use Illuminate\Support\Facades\DB;

final class AnularCotizacion
{
    public function __construct(private readonly CotizacionService $service) {}

    public function ejecutar(int $id): void
    {
        $operacion = function () use ($id) {
            $cotizacion = Cotizacion::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $this->service->anularConCotizacion($cotizacion);
        };

        if (DB::transactionLevel() > 0) {
            $operacion();
        } else {
            DB::transaction($operacion);
        }
    }
}
