<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\PlanSuscripcion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PlanSuscripcion> */
class PlanSuscripcionFactory extends Factory
{
    protected $model = PlanSuscripcion::class;

    public function definition(): array
    {
        return [
            'nombre' => fake()->unique()->words(2, true),
            'slug' => fake()->unique()->slug(),
            'limite_usuarios' => 10,
            'limite_sucursales' => 1,
            'precio_mensual' => 100,
            'precio_anual' => 1000,
            'features' => [],
            'activo' => true,
        ];
    }
}
