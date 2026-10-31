<?php

namespace App\Modules\CuentasCobrar\Database\Factories;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * El saldo no se recalcula desde los abonos; para cuadrarlo usa
 * CuentasCobrarService.
 *
 * @extends Factory<CuentaCobrar>
 */
class CuentaCobrarFactory extends Factory
{
    protected $model = CuentaCobrar::class;

    public function definition(): array
    {
        return [
            'venta_id' => fn (array $a) => Venta::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['venta_id'])
                ? Venta::query()->withoutGlobalScopes()->whereKey($a['venta_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'cliente_id' => fn (array $a) => Venta::query()->withoutGlobalScopes()
                ->whereKey($a['venta_id'])
                ->firstOrFail()
                ->getAttribute('cliente_id'),
            'monto_total' => fn (array $a) => Venta::query()->withoutGlobalScopes()
                ->whereKey($a['venta_id'])
                ->firstOrFail()
                ->getAttribute('total'),
            'saldo_pendiente' => fn (array $a) => (float) $a['monto_total'],
            'fecha_vencimiento' => now()->addDays(30)->toDateString(),
            'estado' => 'pendiente',
        ];
    }

    public function pagada(): static
    {
        return $this->state(fn () => [
            'estado' => 'pagada',
            'saldo_pendiente' => 0,
        ]);
    }

    public function anulada(): static
    {
        return $this->state(fn () => ['estado' => 'anulada']);
    }
}
