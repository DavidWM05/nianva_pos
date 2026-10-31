<?php

namespace App\Modules\Produccion\Database\Factories;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Produccion\Models\TransformacionProducto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Las cantidades y el stock no se ajustan con InventarioService; esta factory
 * solo crea el registro de la transformacion.
 *
 * @extends Factory<TransformacionProducto>
 */
class TransformacionProductoFactory extends Factory
{
    protected $model = TransformacionProducto::class;

    public function definition(): array
    {
        return [
            'variante_origen_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
                ])->id,
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['variante_origen_id'])
                ? Producto::query()->withoutGlobalScopes()
                    ->whereKey(ProductoVariante::query()->withoutGlobalScopes()
                        ->whereKey($a['variante_origen_id'])
                        ->firstOrFail()
                        ->getAttribute('producto_id'))
                    ->firstOrFail()
                    ->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'variante_destino_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            ])->id,
            'cantidad_origen' => 1,
            'cantidad_destino' => 1,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'],
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'notas' => null,
        ];
    }
}
