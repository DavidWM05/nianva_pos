<?php

namespace App\Modules\Cotizaciones\Database\Factories;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CotizacionDetalle>
 */
class CotizacionDetalleFactory extends Factory
{
    protected $model = CotizacionDetalle::class;

    public function definition(): array
    {
        return [
            'cotizacion_id' => fn () => Cotizacion::factory()->create()->id,
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => Cotizacion::query()->withoutGlobalScopes()
                        ->whereKey($a['cotizacion_id'])
                        ->firstOrFail()
                        ->getAttribute('tenant_id'),
                ])->id,
            ])->id,
            'cantidad' => 1,
            'precio_unitario' => 100,
            'descuento' => 0,
            'subtotal' => 100,
        ];
    }
}
