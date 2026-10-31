<?php

namespace App\Modules\GiftCards\Database\Factories;

use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Models\GiftCardRecarga;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GiftCardRecarga>
 */
class GiftCardRecargaFactory extends Factory
{
    protected $model = GiftCardRecarga::class;

    public function definition(): array
    {
        return [
            'gift_card_id' => fn () => GiftCard::factory()->create()->id,
            'caja_sesion_id' => null,
            'monto' => 10,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => GiftCard::query()->withoutGlobalScopes()
                    ->whereKey($a['gift_card_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
        ];
    }
}
