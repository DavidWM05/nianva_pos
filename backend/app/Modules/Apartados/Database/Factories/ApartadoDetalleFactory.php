<?php

namespace App\Modules\Apartados\Database\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
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
            'subtotal' => 100,
        ];
    }
}
