<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Proveedor> */
class ProveedorFactory extends Factory
{
    protected $model = Proveedor::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'razon_social' => fake()->unique()->company(),
            'rfc' => fake()->bothify('RFC######'),
            'telefono' => fake()->numerify('555#######'),
            'correo' => fake()->unique()->companyEmail(),
            'direccion' => fake()->address(),
            'activo' => true,
        ];
    }
}
