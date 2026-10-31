<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Tenant> */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        return [
            'nombre' => fake()->unique()->company(),
            'razon_social' => fake()->company(),
            'rfc' => fake()->bothify('RFC######'),
            'telefono' => fake()->numerify('555#######'),
            'correo' => fake()->unique()->companyEmail(),
            'direccion' => fake()->address(),
            'pais' => 'MX',
            'activo' => true,
        ];
    }
}
