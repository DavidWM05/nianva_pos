<?php

declare(strict_types=1);

namespace App\Modules\Devoluciones\Database\Factories;

use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Devoluciones\Models\DevolucionLineaRegla;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DevolucionLineaRegla> */
class DevolucionLineaReglaFactory extends Factory
{
    protected $model = DevolucionLineaRegla::class;

    public function definition(): array
    {
        return [
            'devolucion_item_id' => fn () => DevolucionItem::factory()->create()->id,
            'regla_precio_id' => fake()->numberBetween(1, 999),
            'regla_nombre' => fake()->words(2, true),
            'descuento' => 5,
        ];
    }
}
