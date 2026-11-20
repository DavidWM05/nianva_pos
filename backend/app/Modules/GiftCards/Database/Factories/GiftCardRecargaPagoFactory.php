<?php

declare(strict_types=1);

namespace App\Modules\GiftCards\Database\Factories;

use App\Modules\GiftCards\Models\GiftCardRecarga;
use App\Modules\GiftCards\Models\GiftCardRecargaPago;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<GiftCardRecargaPago> */
class GiftCardRecargaPagoFactory extends Factory
{
    protected $model = GiftCardRecargaPago::class;

    public function definition(): array
    {
        return ['recarga_id' => fn () => GiftCardRecarga::factory()->create()->id, 'metodo_pago_id' => fn () => MetodoEfectivo::id(), 'monto' => fn (array $a) => GiftCardRecarga::query()->withoutGlobalScopes()->whereKey($a['recarga_id'])->firstOrFail()->getAttribute('monto')];
    }
}
