<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Rol> */
class RolFactory extends Factory
{
    protected $model = Rol::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->unique()->jobTitle(),
            'descripcion' => fake()->sentence(),
            'es_sistema' => false,
        ];
    }

    public function sistema(): static
    {
        return $this->state(fn () => [
            'tenant_id' => null,
            'es_sistema' => true,
        ]);
    }
}
