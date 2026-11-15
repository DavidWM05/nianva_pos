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
            // El campo que no le toca al tipo queda null; nxm y bundle sin ninguno (DAT-02b).
            'porcentaje' => fn (array $a) => $a['tipo'] === 'porcentaje' ? 10 : null,
            'monto' => fn (array $a) => $a['tipo'] === 'monto_fijo' ? 10 : null,
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
