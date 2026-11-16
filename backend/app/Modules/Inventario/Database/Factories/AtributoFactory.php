<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Atributo;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Atributo> */
class AtributoFactory extends Factory
{
    protected $model = Atributo::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->unique()->word(),
            'orden' => 0,
        ];
    }
}
