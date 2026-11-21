<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Terminal> */
final class TerminalFactory extends Factory
{
    protected $model = Terminal::class;

    public function definition(): array
    {
        return [
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
            ])->id,
            'tenant_id' => fn (array $a) => Sucursal::sinTenant()->whereKey($a['sucursal_id'])->firstOrFail()->tenant_id,
            'nombre' => fake()->words(2, true),
        ];
    }
}
