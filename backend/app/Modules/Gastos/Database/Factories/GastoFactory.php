<?php

namespace App\Modules\Gastos\Database\Factories;

use App\Modules\Gastos\Models\Gasto;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Gasto> */
class GastoFactory extends Factory
{
    protected $model = Gasto::class;

    public function definition(): array
    {
        return [
            'caja_sesion_id' => fn () => CajaSesion::factory()->create()->id,
            'sucursal_id' => fn (array $a) => CajaSesion::query()->withoutGlobalScopes()->whereKey($a['caja_sesion_id'])->firstOrFail()->getAttribute('sucursal_id'),
            'usuario_id' => fn (array $a) => CajaSesion::query()->withoutGlobalScopes()->whereKey($a['caja_sesion_id'])->firstOrFail()->getAttribute('usuario_id'),
            'descripcion' => fake()->sentence(3),
            'monto' => fake()->randomFloat(2, 1, 100),
        ];
    }
}
