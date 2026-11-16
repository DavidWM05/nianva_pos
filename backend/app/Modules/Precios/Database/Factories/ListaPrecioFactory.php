<?php

declare(strict_types=1);

namespace App\Modules\Precios\Database\Factories;

use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Precios\Models\ListaPrecio;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ListaPrecio> */
class ListaPrecioFactory extends Factory
{
    protected $model = ListaPrecio::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->unique()->words(3, true),
            'activo' => true,
        ];
    }
}
