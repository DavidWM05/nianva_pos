<?php

namespace App\Modules\Crm\Database\Factories;

use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Crm\Models\PlanPagoClienteCuota;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PlanPagoClienteCuota> */
class PlanPagoClienteCuotaFactory extends Factory
{
    protected $model = PlanPagoClienteCuota::class;

    public function definition(): array
    {
        return [
            'plan_pago_cliente_id' => PlanPagoCliente::factory(),
            'numero_cuota' => 1,
            'monto' => 100,
            'monto_capital' => 100,
            'monto_interes' => 0,
            'fecha_vencimiento' => now()->addMonth()->toDateString(),
            'fecha_pago' => null,
            'fecha_pago_real' => null,
            'estado' => 'pendiente',
        ];
    }
}
