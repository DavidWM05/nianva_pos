<?php

namespace App\Modules\Delivery\Database\Factories;

use App\Modules\Delivery\Models\Pedido;
use App\Modules\Delivery\Models\PedidoItem;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PedidoItem>
 */
class PedidoItemFactory extends Factory
{
    protected $model = PedidoItem::class;

    public function definition(): array
    {
        return [
            'pedido_id' => fn () => Pedido::factory()->create()->id,
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => Pedido::query()->withoutGlobalScopes()
                        ->whereKey($a['pedido_id'])
                        ->firstOrFail()
                        ->getAttribute('tenant_id'),
                ])->id,
            ])->id,
            'cantidad' => 1,
            'precio_unitario' => 100,
            'subtotal' => 100,
        ];
    }
}
