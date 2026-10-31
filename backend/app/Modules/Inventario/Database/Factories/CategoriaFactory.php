<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Categoria> */
class CategoriaFactory extends Factory
{
    protected $model = Categoria::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->unique()->words(2, true),
            'descripcion' => fake()->sentence(),
            'activo' => true,
        ];
    }
}
