<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Sucursal;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<InventarioStock> */
class InventarioStockFactory extends Factory
{
    protected $model = InventarioStock::class;

    public function definition(): array
    {
        return [
            'sucursal_id' => fn () => Sucursal::factory()->create()->id,
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => Sucursal::query()->withoutGlobalScopes()->whereKey($a['sucursal_id'])->firstOrFail()->getAttribute('tenant_id'),
                ])->id,
            ])->id,
            'stock_actual' => fake()->numberBetween(0, 100),
            'stock_minimo' => 0,
        ];
    }
}
