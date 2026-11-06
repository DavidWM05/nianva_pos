<?php

declare(strict_types=1);

namespace App\Aplicacion\GiftCards;

use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Services\GiftCardService;
use Illuminate\Support\Facades\DB;

final class CancelarGiftCard
{
    public function __construct(private readonly GiftCardService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(int $id): void
    {
        $operacion = function () use ($id) {
            $tarjeta = GiftCard::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $this->service->cancelarConTarjeta($tarjeta);
        };

        if (DB::transactionLevel() > 0) {
            $operacion();
        } else {
            DB::transaction($operacion);
        }
    }
}
