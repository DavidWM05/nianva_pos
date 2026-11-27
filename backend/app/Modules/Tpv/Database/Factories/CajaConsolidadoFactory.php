<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaConsolidado;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CajaConsolidado> */
final class CajaConsolidadoFactory extends Factory
{
    protected $model = CajaConsolidado::class;

    public function definition(): array
    {
        return [
            'sucursal_id' => fn () => Sucursal::factory()->create()->id,
            'usuario_id' => fn (array $atributos) => Usuario::factory()->create([
                'tenant_id' => Sucursal::sinTenant()->whereKey($atributos['sucursal_id'])->value('tenant_id'),
                'sucursal_id' => $atributos['sucursal_id'],
            ])->id,
            'fecha_operativa' => now()->toDateString(),
            'fecha_cierre' => now(),
            'total_teorico' => '0.00',
            'total_contado' => '0.00',
            'diferencia' => '0.00',
        ];
    }
}
