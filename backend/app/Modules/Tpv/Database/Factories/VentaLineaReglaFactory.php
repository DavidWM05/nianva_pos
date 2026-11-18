<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaLineaRegla;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<VentaLineaRegla> */
class VentaLineaReglaFactory extends Factory
{
    protected $model = VentaLineaRegla::class;

    public function definition(): array
    {
        return [
            'venta_detalle_id' => fn () => VentaDetalle::factory()->create()->id,
            'regla_precio_id' => fake()->numberBetween(1, 999),
            'regla_nombre' => fake()->words(2, true),
            'descuento' => 5,
        ];
    }
}
