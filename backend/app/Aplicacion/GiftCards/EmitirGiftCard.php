<?php

declare(strict_types=1);

namespace App\Aplicacion\GiftCards;

use App\Modules\GiftCards\Dtos\EmitirGiftCardDto;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Services\GiftCardService;
use Illuminate\Support\Facades\DB;

final class EmitirGiftCard
{
    public function __construct(private readonly GiftCardService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(EmitirGiftCardDto $dto, int $tenantId): GiftCard
    {
        $operacion = function () use ($dto, $tenantId) {
            return $this->service->emitir(['tenant_id' => $tenantId, 'cliente_id' => $dto->clienteId, 'monto' => $dto->monto, 'fecha_expiracion' => $dto->fechaExpiracion]);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
