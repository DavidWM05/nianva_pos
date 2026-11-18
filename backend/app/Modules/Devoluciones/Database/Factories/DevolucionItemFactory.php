<?php

namespace App\Modules\Devoluciones\Database\Factories;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Support\UnidadDeVariante;
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
            'descuento' => 0,
            'lista_precio_id' => null,
            'lista_precio_nombre' => null,
            'regla_precio_id' => null,
            'regla_nombre' => null,
            'costo_unitario' => 60,
            'tasa_impuesto' => '16.0000',
            'exento' => false,
            'impuesto' => fn (array $a) => round((float) $a['precio_unitario'] * (float) $a['cantidad'] * 0.16 / 1.16, 2),
            'unidad_medida_id' => fn (array $a) => UnidadDeVariante::idPara(ProductoVariante::query()->withoutGlobalScopes()->whereKey($a['variante_id'])->firstOrFail()),
            'factor' => '1.000',
            'subtotal' => 100,
            'va_a_merma' => false,
        ];
    }
}
