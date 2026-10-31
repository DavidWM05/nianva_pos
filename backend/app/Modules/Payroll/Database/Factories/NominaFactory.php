<?php

namespace App\Modules\Payroll\Database\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Payroll\Models\Nomina;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Los totales no se recalculan desde los detalles; usa NominaService.
 *
 * @extends Factory<Nomina>
 */
class NominaFactory extends Factory
{
    protected $model = Nomina::class;

    public function definition(): array
    {
        return [
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['sucursal_id'])
                ? Sucursal::query()->withoutGlobalScopes()->whereKey($a['sucursal_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'periodo_inicio' => now()->startOfMonth()->toDateString(),
            'periodo_fin' => now()->endOfMonth()->toDateString(),
            'total_percepciones' => 1000,
            'total_deducciones' => 0,
            'total_neto' => 1000,
            'estado' => 'calculada',
            'fecha_pago' => null,
        ];
    }

    public function pagada(): static
    {
        return $this->state(fn () => [
            'estado' => 'pagada',
            'fecha_pago' => now()->toDateString(),
        ]);
    }

    public function cancelada(): static
    {
        return $this->state(fn () => ['estado' => 'cancelada']);
    }
}
