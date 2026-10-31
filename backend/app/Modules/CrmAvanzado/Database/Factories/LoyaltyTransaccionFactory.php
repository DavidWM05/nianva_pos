<?php

namespace App\Modules\CrmAvanzado\Database\Factories;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LoyaltyTransaccion>
 */
class LoyaltyTransaccionFactory extends Factory
{
    protected $model = LoyaltyTransaccion::class;

    public function definition(): array
    {
        return [
            'cliente_id' => fn (array $a) => Cliente::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['cliente_id'])
                ? Cliente::query()->withoutGlobalScopes()->whereKey($a['cliente_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'tipo' => 'ganados',
            'puntos' => 10,
            'referencia_tabla' => null,
            'referencia_id' => null,
            'expira_en' => now()->addYear()->toDateString(),
        ];
    }
}
