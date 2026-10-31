<?php

namespace App\Modules\CuentasPagar\Database\Factories;

use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AbonoPagar>
 */
class AbonoPagarFactory extends Factory
{
    protected $model = AbonoPagar::class;

    public function definition(): array
    {
        return [
            'cuenta_pagar_id' => fn () => CuentaPagar::factory()->create()->id,
            'caja_sesion_id' => null,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => CuentaPagar::query()->withoutGlobalScopes()
                    ->whereKey($a['cuenta_pagar_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'monto' => 10,
            'metodo_pago_id' => fn (array $a) => MetodoPago::factory()->create([
                'tenant_id' => CuentaPagar::query()->withoutGlobalScopes()
                    ->whereKey($a['cuenta_pagar_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'referencia' => null,
        ];
    }
}
