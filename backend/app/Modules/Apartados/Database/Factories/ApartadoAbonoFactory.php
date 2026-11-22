<?php

namespace App\Modules\Apartados\Database\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\Dinero;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApartadoAbono> */
class ApartadoAbonoFactory extends Factory
{
    protected $model = ApartadoAbono::class;

    public function definition(): array
    {
        return [
            'apartado_id' => fn () => Apartado::factory()->create()->id,
            'monto' => 50,
            'saldo_anterior' => function (array $a): string {
                $apartado = Apartado::query()->withoutGlobalScopes()->whereKey($a['apartado_id'])->firstOrFail();

                return Dinero::desde((string) $apartado->getAttribute('total'))
                    ->restar(Dinero::desde((string) $apartado->getAttribute('total_abonado')))->aCadena();
            },
            'saldo_nuevo' => fn (array $a): string => Dinero::desde((string) $a['saldo_anterior'])
                ->restar(Dinero::desde((string) $a['monto']))->aCadena(),
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => Apartado::query()->withoutGlobalScopes()->whereKey($a['apartado_id'])->firstOrFail()->getAttribute('tenant_id'),
                'sucursal_id' => Apartado::query()->withoutGlobalScopes()->whereKey($a['apartado_id'])->firstOrFail()->getAttribute('sucursal_id'),
            ])->id,
            'notas' => null,
        ];
    }
}
