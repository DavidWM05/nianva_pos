<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AtributoValor> */
class AtributoValorFactory extends Factory
{
    protected $model = AtributoValor::class;

    public function definition(): array
    {
        return [
            'atributo_id' => fn (array $a) => Atributo::factory()->create(isset($a['tenant_id']) ? ['tenant_id' => $a['tenant_id']] : [])->id,
            'valor' => fake()->unique()->bothify('V-##??'),
            'orden' => 0,
        ];
    }
}
