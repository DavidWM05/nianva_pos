<?php

namespace App\Modules\Devoluciones\Database\Factories;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionPago;
use App\Modules\Nucleo\Models\MetodoPago;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DevolucionPago> */
class DevolucionPagoFactory extends Factory
{
    protected $model = DevolucionPago::class;

    public function definition(): array
    {
        return [
            'devolucion_id' => fn () => Devolucion::factory()->create()->id,
            'metodo_pago_id' => fn (array $a) => MetodoPago::factory()->create([
                'tenant_id' => Devolucion::query()->withoutGlobalScopes()->whereKey($a['devolucion_id'])->firstOrFail()->getAttribute('tenant_id'),
            ])->id,
            'monto' => 100,
        ];
    }
}
