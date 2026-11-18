<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Support\UnidadDeVariante;
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
            'precio_unitario' => 10,
            'descuento' => 0,
            'lista_precio_id' => null,
            'lista_precio_nombre' => null,
            'regla_precio_id' => null,
            'regla_nombre' => null,
            'costo_unitario' => 10,
            'tasa_impuesto' => '16.0000',
            'exento' => false,
            'impuesto' => fn (array $a) => round((float) $a['precio_unitario'] * (float) $a['cantidad'] * 0.16 / 1.16, 2),
            'unidad_medida_id' => fn (array $a) => UnidadDeVariante::idPara(ProductoVariante::query()->withoutGlobalScopes()->whereKey($a['variante_id'])->firstOrFail()),
            'factor' => '1.000',
            'subtotal' => 10,
        ];
    }
}
