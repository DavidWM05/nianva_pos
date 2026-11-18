<?php

declare(strict_types=1);

namespace App\Modules\VentasPlazos\Database\Factories;

use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoMovimiento;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PlanPagoMovimiento> */
class PlanPagoMovimientoFactory extends Factory
{
    protected $model = PlanPagoMovimiento::class;

    public function definition(): array
    {
        return [
            'plan_pago_cliente_id' => fn () => PlanPagoCliente::factory()->create()->id,
            'tipo' => 'pago_cuota',
            'referencia_tabla' => null,
            'referencia_id' => null,
            'monto' => -10,
            'saldo_antes' => 100,
            'saldo_despues' => 90,
            'usuario_id' => null,
        ];
    }
}
