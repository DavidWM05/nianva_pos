<?php

namespace App\Modules\CrmAvanzado\Database\Factories;

use App\Modules\CrmAvanzado\Models\CrmCampana;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Los destinatarios no se calculan desde los clientes; usa CrmAvanzadoService.
 *
 * @extends Factory<CrmCampana>
 */
class CrmCampanaFactory extends Factory
{
    protected $model = CrmCampana::class;

    public function definition(): array
    {
        return [
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['usuario_id'])
                ? Usuario::query()->withoutGlobalScopes()->whereKey($a['usuario_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'asunto' => fake()->sentence(4),
            'mensaje' => fake()->paragraph(),
            'segmento' => fake()->randomElement(['nuevo', 'frecuente', 'vip', 'inactivo', 'todos']),
            'cliente_ids' => null,
            'destinatarios' => 0,
            'enviado_en' => now(),
        ];
    }
}
