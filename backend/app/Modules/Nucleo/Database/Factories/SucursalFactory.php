<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Sucursal> */
class SucursalFactory extends Factory
{
    protected $model = Sucursal::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->unique()->company(),
            'direccion' => fake()->address(),
            'telefono' => fake()->numerify('555#######'),
            'activo' => true,
        ];
    }
}
