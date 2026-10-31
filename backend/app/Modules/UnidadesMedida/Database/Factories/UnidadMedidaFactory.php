<?php

namespace App\Modules\UnidadesMedida\Database\Factories;

use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnidadMedida>
 */
class UnidadMedidaFactory extends Factory
{
    protected $model = UnidadMedida::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->unique()->word(),
            'abreviatura' => fake()->unique()->bothify('U###'),
            'tipo' => fake()->randomElement(['entero', 'fraccionario']),
            'activo' => true,
        ];
    }

    public function global(): static
    {
        return $this->state(fn () => ['tenant_id' => null]);
    }
}
