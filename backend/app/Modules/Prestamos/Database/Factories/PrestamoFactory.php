<?php

namespace App\Modules\Prestamos\Database\Factories;

use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Prestamos\Models\Prestamo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * El saldo no se recalcula desde los pagos; usa PrestamoService.
 *
 * @extends Factory<Prestamo>
 */
class PrestamoFactory extends Factory
{
    protected $model = Prestamo::class;

    public function definition(): array
    {
        return [
            'proveedor_id' => fn (array $a) => Proveedor::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['proveedor_id'])
                ? Proveedor::query()->withoutGlobalScopes()->whereKey($a['proveedor_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'referencia' => fake()->sentence(3),
            'monto' => 1000,
            'interes' => 10,
            'monto_a_pagar' => 1100,
            'saldo_pendiente' => 1100,
            'fecha_prestamo' => now()->toDateString(),
            'fecha_vencimiento' => now()->addYear()->toDateString(),
            'estado' => 'activo',
            'notas' => null,
        ];
    }

    public function pagado(): static
    {
        return $this->state(fn () => [
            'estado' => 'pagado',
            'saldo_pendiente' => 0,
        ]);
    }

    public function cancelado(): static
    {
        return $this->state(fn () => ['estado' => 'cancelado']);
    }
}
