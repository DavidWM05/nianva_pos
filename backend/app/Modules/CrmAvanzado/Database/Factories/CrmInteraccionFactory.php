<?php

namespace App\Modules\CrmAvanzado\Database\Factories;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CrmInteraccion>
 */
class CrmInteraccionFactory extends Factory
{
    protected $model = CrmInteraccion::class;

    public function definition(): array
    {
        return [
            'cliente_id' => fn (array $a) => Cliente::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['cliente_id'])
                ? Cliente::query()->withoutGlobalScopes()->whereKey($a['cliente_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'usuario_id' => fn (array $a) => Usuario::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'tipo' => fake()->randomElement(['llamada', 'email', 'whatsapp', 'nota', 'visita']),
            'observacion' => fake()->sentence(),
        ];
    }
}
