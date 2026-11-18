<?php

declare(strict_types=1);

namespace App\Modules\CuentasCobrar\Database\Factories;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasCobrar\Models\CuentaCobrarMovimiento;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CuentaCobrarMovimiento> */
class CuentaCobrarMovimientoFactory extends Factory
{
    protected $model = CuentaCobrarMovimiento::class;

    public function definition(): array
    {
        return [
            'cuenta_cobrar_id' => fn () => CuentaCobrar::factory()->create()->id,
            'tipo' => 'abono',
            'referencia_tabla' => null,
            'referencia_id' => null,
            'monto' => -10,
            'saldo_antes' => 100,
            'saldo_despues' => 90,
            'usuario_id' => null,
        ];
    }
}
