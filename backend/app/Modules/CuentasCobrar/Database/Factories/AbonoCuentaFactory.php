<?php

namespace App\Modules\CuentasCobrar\Database\Factories;

use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AbonoCuenta>
 */
class AbonoCuentaFactory extends Factory
{
    protected $model = AbonoCuenta::class;

    public function definition(): array
    {
        return [
            'cuenta_cobrar_id' => fn () => CuentaCobrar::factory()->create()->id,
            'caja_sesion_id' => null,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => CuentaCobrar::query()->withoutGlobalScopes()
                    ->whereKey($a['cuenta_cobrar_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'monto' => 10,
            'metodo_pago_id' => fn (array $a) => MetodoPago::factory()->create([
                'tenant_id' => CuentaCobrar::query()->withoutGlobalScopes()
                    ->whereKey($a['cuenta_cobrar_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'referencia' => null,
        ];
    }
}
