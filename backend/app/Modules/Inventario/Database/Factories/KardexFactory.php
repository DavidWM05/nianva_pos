<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Kardex> */
class KardexFactory extends Factory
{
    protected $model = Kardex::class;

    public function definition(): array
    {
        return [
            'sucursal_id' => fn () => Sucursal::factory()->create()->id,
            'variante_id' => fn (array $a) => ProductoVariante::factory()->create([
                'producto_id' => Producto::factory()->create([
                    'tenant_id' => Sucursal::query()->withoutGlobalScopes()->whereKey($a['sucursal_id'])->firstOrFail()->getAttribute('tenant_id'),
                ])->id,
            ])->id,
            'tipo' => 'entrada',
            'cantidad' => fake()->numberBetween(1, 20),
            'motivo' => 'compra',
            'referencia_tabla' => null,
            'referencia_id' => null,
            'stock_resultante' => fake()->numberBetween(0, 100),
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => Sucursal::query()->withoutGlobalScopes()->whereKey($a['sucursal_id'])->firstOrFail()->getAttribute('tenant_id'),
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
        ];
    }
}
