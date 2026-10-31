<?php

namespace App\Modules\Precios\Database\Factories;

use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Precios\Models\Cupon;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Cupon> */
class CuponFactory extends Factory
{
    protected $model = Cupon::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'codigo' => fake()->unique()->bothify('CUPON-####'),
            'nombre' => fake()->words(2, true),
            'tipo' => 'porcentaje',
            'valor' => 10,
            'uso_maximo' => null,
            'uso_maximo_por_cliente' => null,
            'fecha_inicio' => null,
            'fecha_fin' => null,
            'activo' => true,
        ];
    }
}
