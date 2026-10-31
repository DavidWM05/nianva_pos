<?php

namespace App\Modules\Cotizaciones\Database\Factories;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * El total y el descuento no se recalculan desde los detalles; para cuadrarlos
 * usa CotizacionService.
 *
 * @extends Factory<Cotizacion>
 */
class CotizacionFactory extends Factory
{
    protected $model = Cotizacion::class;

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
            'numero_cotizacion' => fake()->unique()->bothify('COT-######'),
            'total' => 100,
            'descuento' => 0,
            'validez_dias' => 15,
            'estado' => 'pendiente',
            'venta_id' => null,
            'observaciones' => null,
            'fecha_vencimiento' => now()->addDays(15)->toDateString(),
            'uso_cfdi' => null,
        ];
    }

    public function convertida(): static
    {
        return $this->state(fn () => [
            'estado' => 'convertida',
            'venta_id' => fn (array $a) => Venta::factory()->create([
                'tenant_id' => $a['tenant_id'],
                'sucursal_id' => $a['sucursal_id'],
                'cliente_id' => $a['cliente_id'],
                'usuario_id' => $a['usuario_id'],
            ])->id,
        ]);
    }

    public function anulada(): static
    {
        return $this->state(fn () => ['estado' => 'anulada']);
    }

    public function vencida(): static
    {
        return $this->state(fn () => [
            'estado' => 'vencida',
            'fecha_vencimiento' => now()->subDay()->toDateString(),
        ]);
    }
}
