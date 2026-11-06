<?php

declare(strict_types=1);

namespace App\Aplicacion\GiftCards;

use App\Modules\GiftCards\Dtos\CargarGiftCardDto;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Services\GiftCardService;
use Illuminate\Support\Facades\DB;

final class CargarGiftCard
{
    public function __construct(private readonly GiftCardService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(CargarGiftCardDto $dto): void
    {
        $operacion = function () use ($dto) {
            $tarjeta = GiftCard::query()->whereKey($dto->giftCardId)->lockForUpdate()->firstOrFail();
            $this->service->descontarSaldoConTarjeta($tarjeta, $dto->monto);
        };

        if (DB::transactionLevel() > 0) {
            $operacion();
        } else {
            DB::transaction($operacion);
        }
    }
}
