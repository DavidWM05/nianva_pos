<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Tpv\Models\CajaCierreMetodo;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CajaCierreMetodo> */
class CajaCierreMetodoFactory extends Factory
{
    protected $model = CajaCierreMetodo::class;

    public function definition(): array
    {
        return ['caja_sesion_id' => fn () => CajaSesion::factory()->create()->id, 'metodo_pago_id' => fn () => MetodoEfectivo::id(), 'total_teorico' => '0.00', 'monto_contado' => '0.00', 'diferencia' => '0.00'];
    }
}
