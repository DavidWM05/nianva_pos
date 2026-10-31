<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ProductoVariante> */
class ProductoVarianteFactory extends Factory
{
    protected $model = ProductoVariante::class;

    public function definition(): array
    {
        return [
            'producto_id' => Producto::factory(),
            'talla' => fake()->randomElement(['S', 'M', 'L', 'XL']),
            'color' => fake()->safeColorName(),
            'codigo_barras' => fake()->unique()->bothify('BAR-####-????'),
            'activo' => true,
        ];
    }
}
