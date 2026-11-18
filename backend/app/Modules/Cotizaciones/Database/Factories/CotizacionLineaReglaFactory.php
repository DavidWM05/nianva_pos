<?php

declare(strict_types=1);

namespace App\Modules\Cotizaciones\Database\Factories;

use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Cotizaciones\Models\CotizacionLineaRegla;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CotizacionLineaRegla> */
class CotizacionLineaReglaFactory extends Factory
{
    protected $model = CotizacionLineaRegla::class;

    public function definition(): array
    {
        return [
            'cotizacion_detalle_id' => fn () => CotizacionDetalle::factory()->create()->id,
            'regla_precio_id' => fake()->numberBetween(1, 999),
            'regla_nombre' => fake()->words(2, true),
            'descuento' => 5,
        ];
    }
}
