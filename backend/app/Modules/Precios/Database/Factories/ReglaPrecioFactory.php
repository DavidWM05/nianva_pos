<?php

namespace App\Modules\Precios\Database\Factories;

use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Precios\Models\ReglaPrecio;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ReglaPrecio> */
class ReglaPrecioFactory extends Factory
{
    protected $model = ReglaPrecio::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'nombre' => fake()->words(3, true),
            'tipo' => 'porcentaje',
            'valor' => 10,
            'cantidad_compra' => null,
            'cantidad_paga' => null,
            'precio_bundle' => null,
            'aplica_a' => 'todo',
            'categoria_id' => null,
            'producto_id' => null,
            'variante_id' => null,
            'fecha_inicio' => null,
            'fecha_fin' => null,
            'activo' => true,
        ];
    }
}
