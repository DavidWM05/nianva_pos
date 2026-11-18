<?php

namespace App\Modules\Apartados\Database\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Support\UnidadDeVariante;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartadoDetalle> */
class ApartadoDetalleFactory extends Factory
{
    protected $model = ApartadoDetalle::class;

    public function definition(): array
    {
        return [
            'apartado_id' => fn () => Apartado::factory()->create()->id,
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => Apartado::query()->withoutGlobalScopes()->whereKey($a['apartado_id'])->firstOrFail()->getAttribute('tenant_id'),
                ])->id,
            ])->id,
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
        ];
    }
}
