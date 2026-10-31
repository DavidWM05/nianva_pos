<?php

namespace App\Modules\Produccion\Database\Factories;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Produccion\Models\Receta;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Receta>
 */
class RecetaFactory extends Factory
{
    protected $model = Receta::class;

    public function definition(): array
    {
        return [
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
                ])->id,
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['variante_id'])
                ? Producto::query()->withoutGlobalScopes()
                    ->whereKey(ProductoVariante::query()->withoutGlobalScopes()
                        ->whereKey($a['variante_id'])
                        ->firstOrFail()
                        ->getAttribute('producto_id'))
                    ->firstOrFail()
                    ->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'nombre' => fake()->words(2, true),
            'descripcion' => fake()->sentence(),
            'instrucciones' => fake()->paragraph(),
            'rendimiento' => 1,
        ];
    }
}
