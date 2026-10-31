<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CompraDetalle> */
class CompraDetalleFactory extends Factory
{
    protected $model = CompraDetalle::class;

    public function definition(): array
    {
        return [
            'compra_id' => fn () => Compra::factory()->create()->id,
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => Compra::query()->withoutGlobalScopes()->whereKey($a['compra_id'])->firstOrFail()->getAttribute('tenant_id'),
                ])->id,
            ])->id,
            'cantidad' => 1,
            'precio_compra' => 10,
            'subtotal' => 10,
        ];
    }
}
