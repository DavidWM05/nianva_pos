<?php

namespace App\Modules\Auditoria\Database\Factories;

use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Auditoria> */
class AuditoriaFactory extends Factory
{
    protected $model = Auditoria::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'tabla_afectada' => fake()->word(),
            'registro_id' => fake()->numberBetween(1, 99999),
            'accion' => fake()->randomElement(['create', 'update', 'delete']),
            'usuario_id' => fn (array $a) => Usuario::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'cambios' => [],
            'ip' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
        ];
    }
}
