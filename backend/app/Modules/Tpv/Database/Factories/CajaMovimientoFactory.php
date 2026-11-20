<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Database\Factories;

use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Tpv\Models\CajaMovimiento;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CajaMovimiento> */
class CajaMovimientoFactory extends Factory
{
    protected $model = CajaMovimiento::class;

    public function definition(): array
    {
        return [
            'caja_sesion_id' => fn () => CajaSesion::factory()->create()->id,
            'metodo_pago_id' => fn () => MetodoEfectivo::id(),
            'tipo' => 'venta',
            'referencia_tabla' => null,
            'referencia_id' => null,
            'monto' => 100,
            'saldo_antes' => 0,
            'saldo_despues' => 100,
            'usuario_id' => fn (array $a) => CajaSesion::query()->withoutGlobalScopes()->whereKey($a['caja_sesion_id'])->firstOrFail()->getAttribute('usuario_id'),
        ];
    }
}
