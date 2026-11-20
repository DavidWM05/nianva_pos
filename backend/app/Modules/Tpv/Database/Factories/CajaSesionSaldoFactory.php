<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\CajaSesionSaldo;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CajaSesionSaldo> */
class CajaSesionSaldoFactory extends Factory
{
    protected $model = CajaSesionSaldo::class;

    public function definition(): array
    {
        return ['caja_sesion_id' => fn () => CajaSesion::factory()->create()->id, 'metodo_pago_id' => fn () => MetodoEfectivo::id(), 'saldo_teorico' => '0.00'];
    }
}
