<?php

namespace App\Modules\Devoluciones\Database\Factories;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Devolucion> */
class DevolucionFactory extends Factory
{
    protected $model = Devolucion::class;

    public function definition(): array
    {
        return [
            'venta_id' => fn () => Venta::factory()->create()->id,
            'tenant_id' => fn (array $a) => Venta::query()->withoutGlobalScopes()->whereKey($a['venta_id'])->firstOrFail()->getAttribute('tenant_id'),
            'sucursal_id' => fn (array $a) => Venta::query()->withoutGlobalScopes()->whereKey($a['venta_id'])->firstOrFail()->getAttribute('sucursal_id'),
            'venta_sombra_id' => null,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'],
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'tipo' => 'devolucion',
            'monto_devolucion' => 100,
            'monto_cambio' => 0,
            'diferencia' => -100,
            'motivo' => null,
            'tipo_reembolso' => 'efectivo',
            'nota_credito_id' => null,
        ];
    }
}
