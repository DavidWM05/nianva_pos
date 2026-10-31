<?php

namespace App\Modules\Payroll\Database\Factories;

use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Payroll\Models\Empleado;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Empleado>
 */
class EmpleadoFactory extends Factory
{
    protected $model = Empleado::class;

    public function definition(): array
    {
        return [
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'] ?? TenantParaFactory::id(),
            ])->id,
            'tenant_id' => fn (array $a) => isset($a['usuario_id'])
                ? Usuario::query()->withoutGlobalScopes()->whereKey($a['usuario_id'])->firstOrFail()->getAttribute('tenant_id')
                : TenantParaFactory::id(),
            'sucursal_id' => fn (array $a) => Usuario::query()->withoutGlobalScopes()
                ->whereKey($a['usuario_id'])
                ->firstOrFail()
                ->getAttribute('sucursal_id'),
            'salario_base' => 1000,
            'tipo_salario' => 'fijo',
            'fecha_ingreso' => now()->subYear()->toDateString(),
            'numero_seguridad_social' => null,
            'activo' => true,
        ];
    }
}
