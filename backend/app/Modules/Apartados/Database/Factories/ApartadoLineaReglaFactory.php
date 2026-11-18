<?php

declare(strict_types=1);

namespace App\Modules\Apartados\Database\Factories;

use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Apartados\Models\ApartadoLineaRegla;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartadoLineaRegla> */
class ApartadoLineaReglaFactory extends Factory
{
    protected $model = ApartadoLineaRegla::class;

    public function definition(): array
    {
        return [
            'apartado_detalle_id' => fn () => ApartadoDetalle::factory()->create()->id,
            'regla_precio_id' => fake()->numberBetween(1, 999),
            'regla_nombre' => fake()->words(2, true),
            'descuento' => 5,
        ];
    }
}
