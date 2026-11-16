<?php

declare(strict_types=1);

namespace App\Modules\Precios\Database\Factories;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ListaPrecioItem> */
class ListaPrecioItemFactory extends Factory
{
    protected $model = ListaPrecioItem::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'lista_precio_id' => ListaPrecio::factory(),
            'producto_id' => fn (array $a) => isset($a['variante_id']) ? null : Producto::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'variante_id' => null,
            'precio' => '100.00',
        ];
    }
}
