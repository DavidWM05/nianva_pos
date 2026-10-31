<?php

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaPago;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<VentaPago> */
class VentaPagoFactory extends Factory
{
    protected $model = VentaPago::class;

    public function definition(): array
    {
        return [
            'venta_id' => fn () => Venta::factory()->create()->id,
            'metodo_pago_id' => fn (array $a) => MetodoPago::factory()->create([
                'tenant_id' => Venta::query()->withoutGlobalScopes()->whereKey($a['venta_id'])->firstOrFail()->getAttribute('tenant_id'),
            ])->id,
            'monto' => 100,
        ];
    }
}
