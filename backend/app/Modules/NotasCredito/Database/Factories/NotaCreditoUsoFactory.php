<?php

namespace App\Modules\NotasCredito\Database\Factories;

use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotaCreditoUso>
 */
class NotaCreditoUsoFactory extends Factory
{
    protected $model = NotaCreditoUso::class;

    public function definition(): array
    {
        return [
            'nota_credito_id' => fn () => NotaCredito::factory()->create()->id,
            'venta_id' => fn (array $a) => Venta::factory()->create([
                'tenant_id' => NotaCredito::query()->withoutGlobalScopes()
                    ->whereKey($a['nota_credito_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'monto_usado' => 10,
        ];
    }
}
