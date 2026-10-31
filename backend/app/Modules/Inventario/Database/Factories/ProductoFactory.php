<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Departamento;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Producto> */
class ProductoFactory extends Factory
{
    protected $model = Producto::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'categoria_id' => fn (array $a) => Categoria::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'departamento_id' => fn (array $a) => Departamento::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'nombre' => fake()->unique()->words(3, true),
            'descripcion' => fake()->sentence(),
            'precio_compra' => fake()->randomFloat(2, 1, 100),
            'precio_venta' => fake()->randomFloat(2, 101, 500),
            'imagen_url' => null,
            'no_resurtible' => false,
            'sin_descuento' => false,
            'activo' => true,
        ];
    }
}
