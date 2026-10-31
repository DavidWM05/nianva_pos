<?php

namespace App\Modules\Apartados\Database\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Models\ApartadoAbonoPago;
use App\Modules\Nucleo\Models\MetodoPago;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartadoAbonoPago> */
class ApartadoAbonoPagoFactory extends Factory
{
    protected $model = ApartadoAbonoPago::class;

    public function definition(): array
    {
        return [
            'abono_id' => fn () => ApartadoAbono::factory()->create()->id,
            'metodo_pago_id' => fn (array $a) => MetodoPago::factory()->create([
                'tenant_id' => Apartado::query()->withoutGlobalScopes()
                    ->whereKey(ApartadoAbono::query()->withoutGlobalScopes()->whereKey($a['abono_id'])->firstOrFail()->getAttribute('apartado_id'))
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'monto' => 50,
        ];
    }
}
