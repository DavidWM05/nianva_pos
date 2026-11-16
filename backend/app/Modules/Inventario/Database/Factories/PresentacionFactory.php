<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Presentacion> */
class PresentacionFactory extends Factory
{
    protected $model = Presentacion::class;

    public function definition(): array
    {
        return ['variante_id' => fn (array $a) => ProductoVariante::factory()->create(['producto_id' => Producto::factory()->create(is_int($a['tenant_id'] ?? null) ? ['tenant_id' => $a['tenant_id']] : [])->id])->id, 'tenant_id' => fn (array $a) => ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->whereKey($a['variante_id'])->firstOrFail()->getAttribute('tenant_id'), 'nombre' => fake()->word(), 'factor' => '6.000', 'precio_venta' => null, 'codigo_barras' => null];
    }
}
