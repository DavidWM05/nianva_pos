<?php

namespace App\Modules\Payroll\Database\Factories;

use App\Modules\Payroll\Models\Empleado;
use App\Modules\Payroll\Models\Nomina;
use App\Modules\Payroll\Models\NominaDetalle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NominaDetalle>
 */
class NominaDetalleFactory extends Factory
{
    protected $model = NominaDetalle::class;

    public function definition(): array
    {
        return [
            'nomina_id' => fn () => Nomina::factory()->create()->id,
            'empleado_id' => fn (array $a) => Empleado::factory()->create([
                'tenant_id' => Nomina::query()->withoutGlobalScopes()
                    ->whereKey($a['nomina_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'salario_base' => fn (array $a) => Empleado::query()->withoutGlobalScopes()
                ->whereKey($a['empleado_id'])
                ->firstOrFail()
                ->getAttribute('salario_base'),
            'dias_trabajados' => 30,
            'percepciones' => fn (array $a) => $a['salario_base'],
            'deducciones' => 0,
            'neto' => fn (array $a) => $a['salario_base'],
        ];
    }
}
