<?php

namespace App\Modules\GiftCards\Database\Factories;

use App\Modules\Crm\Models\Cliente;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * El saldo_actual no se recalcula desde las recargas; usa GiftCardService.
 *
 * @extends Factory<GiftCard>
 */
class GiftCardFactory extends Factory
{
    protected $model = GiftCard::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'cliente_id' => fn (array $a) => Cliente::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'codigo' => fake()->unique()->bothify('GC-####-????'),
            'saldo_inicial' => 100,
            'saldo_actual' => 100,
            'fecha_expiracion' => now()->addYear()->toDateString(),
            'estado' => 'activa',
        ];
    }

    public function cancelada(): static
    {
        return $this->state(fn () => ['estado' => 'cancelada']);
    }

    public function usada(): static
    {
        return $this->state(fn () => [
            'estado' => 'usada',
            'saldo_actual' => 0,
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
