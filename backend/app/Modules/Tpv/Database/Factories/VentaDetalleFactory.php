<?php

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<VentaDetalle> */
class VentaDetalleFactory extends Factory
{
    protected $model = VentaDetalle::class;

    public function definition(): array
    {
        return [
            'venta_id' => fn () => Venta::factory()->create()->id,
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => Venta::query()->withoutGlobalScopes()->whereKey($a['venta_id'])->firstOrFail()->getAttribute('tenant_id'),
                ])->id,
            ])->id,
            'regla_precio_id' => null,
            'cantidad' => 1,
            'precio_unitario' => 100,
            'descuento_aplicado' => 0,
            'subtotal' => 100,
        ];
    }
}
