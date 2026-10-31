<?php

namespace App\Modules\Apartados\Database\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Apartado> */
class ApartadoFactory extends Factory
{
    protected $model = Apartado::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'cliente_id' => fn (array $a) => Cliente::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'],
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'venta_id' => null,
            'total' => 100,
            'total_abonado' => 0,
            'estado' => 'activo',
            'fecha_vencimiento' => now()->addMonth()->toDateString(),
            'fecha_completado' => null,
            'fecha_cancelado' => null,
            'usuario_cancelacion_id' => null,
            'motivo_cancelacion' => null,
            'notas' => null,
        ];
    }

    public function liquidado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'completado',
            'total_abonado' => $attributes['total'],
            'fecha_completado' => now(),
        ]);
    }
}
