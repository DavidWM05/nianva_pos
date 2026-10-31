<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<MetodoPago> */
class MetodoPagoFactory extends Factory
{
    protected $model = MetodoPago::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->unique()->word(),
            'tipo' => fake()->randomElement(['efectivo', 'tarjeta', 'transferencia', 'digital', 'otro']),
            'incluir_en_financiero' => true,
            'activo' => true,
        ];
    }

    public function global(): static
    {
        return $this->state(fn () => ['tenant_id' => null]);
    }
}
