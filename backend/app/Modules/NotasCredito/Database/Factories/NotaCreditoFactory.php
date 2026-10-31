<?php

namespace App\Modules\NotasCredito\Database\Factories;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * El saldo_disponible no se recalcula desde los usos; usa NotaCreditoService.
 *
 * @extends Factory<NotaCredito>
 */
class NotaCreditoFactory extends Factory
{
    protected $model = NotaCredito::class;

    public function definition(): array
    {
        return [
            'devolucion_id' => fn (array $a) => Devolucion::factory()->create([
                'venta_id' => Venta::factory()->create([
                    'tenant_id' => is_numeric($a['tenant_id'] ?? null)
                        ? $a['tenant_id']
                        : TenantParaFactory::id(),
                ])->id,
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['devolucion_id'])
                ? Devolucion::query()->withoutGlobalScopes()->whereKey($a['devolucion_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'cliente_id' => fn (array $a) => Venta::query()->withoutGlobalScopes()
                ->whereKey(
                    Devolucion::query()->withoutGlobalScopes()
                        ->whereKey($a['devolucion_id'])
                        ->firstOrFail()
                        ->getAttribute('venta_id'),
                )
                ->firstOrFail()
                ->getAttribute('cliente_id'),
            'monto_original' => fn (array $a) => Devolucion::query()->withoutGlobalScopes()
                ->whereKey($a['devolucion_id'])
                ->firstOrFail()
                ->getAttribute('monto_devolucion'),
            'saldo_disponible' => fn (array $a) => (float) $a['monto_original'],
            'fecha_expiracion' => now()->addYear()->toDateString(),
            'estado' => 'activa',
        ];
    }

    public function usadaParcial(): static
    {
        return $this->state(fn () => [
            'estado' => 'usada_parcial',
            'saldo_disponible' => 50,
        ]);
    }

    public function usadaTotal(): static
    {
        return $this->state(fn () => [
            'estado' => 'usada_total',
            'saldo_disponible' => 0,
        ]);
    }

    public function expirada(): static
    {
        return $this->state(fn () => [
            'estado' => 'expirada',
            'fecha_expiracion' => now()->subDay()->toDateString(),
        ]);
    }
}
