<?php

namespace App\Modules\Produccion\Database\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Models\Receta;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrdenProduccion>
 */
class OrdenProduccionFactory extends Factory
{
    protected $model = OrdenProduccion::class;

    public function definition(): array
    {
        return [
            'receta_id' => fn (array $a) => Receta::factory()->create(
                is_numeric($a['tenant_id'] ?? null) ? ['tenant_id' => $a['tenant_id']] : [],
            )->id,
            'tenant_id' => fn (array $a) => isset($a['receta_id'])
                ? Receta::query()->withoutGlobalScopes()->whereKey($a['receta_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'],
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'cantidad_programada' => 1,
            'cantidad_producida' => null,
            'estado' => 'pendiente',
            'notas' => null,
            'fecha_programada' => now()->addDay()->toDateString(),
            'fecha_completada' => null,
        ];
    }

    public function completada(): static
    {
        return $this->state(fn (array $a) => [
            'estado' => 'completada',
            'cantidad_producida' => $a['cantidad_programada'],
            'fecha_completada' => now(),
        ]);
    }

    public function cancelada(): static
    {
        return $this->state(fn () => ['estado' => 'cancelada']);
    }
}
