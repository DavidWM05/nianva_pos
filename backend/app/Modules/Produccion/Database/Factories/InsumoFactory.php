<?php

namespace App\Modules\Produccion\Database\Factories;

use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Insumo>
 */
class InsumoFactory extends Factory
{
    protected $model = Insumo::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->words(2, true),
            'sku' => fake()->unique()->bothify('INS-####-????'),
            'unidad_medida_id' => fn (array $a) => UnidadMedida::factory()->create([
                'tenant_id' => $a['tenant_id'],
            ])->id,
            'costo' => 10,
            'stock_minimo' => 0,
            'activo' => true,
        ];
    }
}
