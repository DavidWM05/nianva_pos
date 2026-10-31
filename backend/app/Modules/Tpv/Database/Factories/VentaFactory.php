<?php

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Venta> */
class VentaFactory extends Factory
{
    protected $model = Venta::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'],
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'caja_sesion_id' => fn (array $a) => CajaSesion::factory()->create([
                'sucursal_id' => $a['sucursal_id'],
                'usuario_id' => $a['usuario_id'],
            ])->id,
            'cliente_id' => fn (array $a) => Cliente::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'cupon_id' => null,
            'total' => 100,
            'descuento_cupon' => 0,
            'descuento_manual' => 0,
            'abono_previo' => 0,
            'es_venta_sombra' => false,
            'estado' => 'completada',
        ];
    }

    public function anulada(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'anulada',
            'motivo_anulacion' => 'Anulada en factory',
            'fecha_anulacion' => now(),
            'usuario_anulacion_id' => $attributes['usuario_id'],
        ]);
    }
}
