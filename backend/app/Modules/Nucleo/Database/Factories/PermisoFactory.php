<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\Permiso;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Permiso> */
class PermisoFactory extends Factory
{
    protected $model = Permiso::class;

    public function definition(): array
    {
        $accion = fake()->unique()->bothify('accion-####');

        return [
            'modulo' => 'modulo',
            'accion' => $accion,
            'nombre' => "modulo.{$accion}",
            'descripcion' => fake()->sentence(),
        ];
    }
}
