<?php

namespace App\Modules\Crm\Database\Factories;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Cliente> */
class ClienteFactory extends Factory
{
    protected $model = Cliente::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->unique()->name(),
            'documento_fiscal' => fake()->bothify('RFC######'),
            'telefono' => fake()->numerify('555#######'),
            'correo' => fake()->unique()->safeEmail(),
            'direccion' => fake()->address(),
            'activo' => true,
            'es_sistema' => false,
            'segmento' => null,
        ];
    }
}
