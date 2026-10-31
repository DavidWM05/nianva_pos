<?php

namespace App\Modules\CuentasPagar\Database\Factories;

use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * El saldo no se recalcula desde los pagos; para cuadrarlo usa
 * CuentasPagarService.
 *
 * @extends Factory<CuentaPagar>
 */
class CuentaPagarFactory extends Factory
{
    protected $model = CuentaPagar::class;

    public function definition(): array
    {
        return [
            'compra_id' => fn (array $a) => Compra::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
                'total' => 100,
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['compra_id'])
                ? Compra::query()->withoutGlobalScopes()->whereKey($a['compra_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'proveedor_id' => fn (array $a) => Compra::query()->withoutGlobalScopes()
                ->whereKey($a['compra_id'])
                ->firstOrFail()
                ->getAttribute('proveedor_id'),
            'monto_total' => fn (array $a) => Compra::query()->withoutGlobalScopes()
                ->whereKey($a['compra_id'])
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
