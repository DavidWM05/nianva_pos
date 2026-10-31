<?php

namespace App\Modules\Produccion\Database\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InsumoStock>
 */
class InsumoStockFactory extends Factory
{
    protected $model = InsumoStock::class;

    public function definition(): array
    {
        return [
            'insumo_id' => fn () => Insumo::factory()->create()->id,
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create([
                'tenant_id' => Insumo::query()->withoutGlobalScopes()
                    ->whereKey($a['insumo_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'cantidad' => 10,
            'lote' => fake()->unique()->bothify('LOTE-####'),
            'fecha_vencimiento' => null,
        ];
    }
}
