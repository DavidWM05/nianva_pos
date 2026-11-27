<?php

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Terminal;
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
            'terminal_id' => fn (array $a) => Terminal::factory()->create(['sucursal_id' => $a['sucursal_id']])->id,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => Sucursal::query()->withoutGlobalScopes()->whereKey($a['sucursal_id'])->firstOrFail()->getAttribute('tenant_id'),
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'usuario_cierre_id' => null,
            'monto_apertura' => 0,
            'monto_cierre' => null,
            'total_ventas_sistema' => null,
            'diferencia' => null,
            'fecha_apertura' => now(),
            'fecha_operativa' => fn (array $a) => (new \DateTimeImmutable((string) $a['fecha_apertura']))->setTimezone(new \DateTimeZone('America/Mexico_City'))->format('Y-m-d'),
            'fecha_cierre' => null,
            'estado' => 'abierta',
        ];
    }

    public function cerrada(): static
    {
        return $this->state(fn (array $a) => [
            'estado' => 'cerrada',
            'usuario_cierre_id' => $a['usuario_id'],
            'monto_cierre' => 0,
            'total_ventas_sistema' => 0,
            'diferencia' => 0,
            'fecha_cierre' => now(),
        ]);
    }
}
