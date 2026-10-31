<?php

namespace App\Modules\Devoluciones\Database\Factories;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DevolucionItem> */
class DevolucionItemFactory extends Factory
{
    protected $model = DevolucionItem::class;

    public function definition(): array
    {
        return [
            'devolucion_id' => fn () => Devolucion::factory()->create()->id,
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => Devolucion::query()->withoutGlobalScopes()->whereKey($a['devolucion_id'])->firstOrFail()->getAttribute('tenant_id'),
                ])->id,
            ])->id,
            'tipo' => 'devuelto',
            'cantidad' => 1,
            'precio_unitario' => 100,
            'subtotal' => 100,
            'va_a_merma' => false,
        ];
    }
}
