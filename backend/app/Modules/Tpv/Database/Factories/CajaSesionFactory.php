<?php

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CajaSesion> */
class CajaSesionFactory extends Factory
{
    protected $model = CajaSesion::class;

    public function definition(): array
    {
        return [
            'sucursal_id' => fn () => Sucursal::factory()->create()->id,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => Sucursal::query()->withoutGlobalScopes()->whereKey($a['sucursal_id'])->firstOrFail()->getAttribute('tenant_id'),
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'monto_apertura' => 0,
            'monto_cierre' => null,
            'total_ventas_sistema' => null,
            'diferencia' => null,
            'fecha_apertura' => now(),
            'fecha_cierre' => null,
            'estado' => 'abierta',
        ];
    }

    public function cerrada(): static
    {
        return $this->state(fn () => [
            'estado' => 'cerrada',
            'monto_cierre' => 0,
            'total_ventas_sistema' => 0,
            'diferencia' => 0,
            'fecha_cierre' => now(),
        ]);
    }
}
