<?php

namespace App\Modules\VentasPlazos\Database\Factories;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PlanPagoCliente> */
class PlanPagoClienteFactory extends Factory
{
    protected $model = PlanPagoCliente::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'cliente_id' => fn (array $a) => Cliente::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'venta_id' => null,
            'concepto' => fake()->sentence(3),
            'monto_total' => 100,
            'interes_total' => 0,
            'tasa_interes' => null,
            'numero_cuotas' => 1,
            'periodicidad' => 'mensual',
            'fecha_inicio' => now()->toDateString(),
        ];
    }
}
