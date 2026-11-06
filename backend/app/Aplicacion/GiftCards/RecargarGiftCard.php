<?php

declare(strict_types=1);

namespace App\Aplicacion\GiftCards;

use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Services\GiftCardService;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;

final class RecargarGiftCard
{
    public function __construct(private readonly GiftCardService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(RecargarGiftCardDto $dto, int $id, Usuario $usuario): GiftCard
    {
        $operacion = function () use ($dto, $id, $usuario) {
            // Resolver caja abierta de la sucursal antes de bloquear la cuenta.
            $caja = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', (int) $usuario->getAttribute('sucursal_id'))->where('estado', 'abierta')->latest('id')->lockForUpdate()->first();
            $tarjeta = GiftCard::query()->whereKey($id)->lockForUpdate()->firstOrFail();

            return $this->service->recargarConTarjeta($tarjeta, $dto->monto, $usuario->id, $caja === null ? null : (int) $caja->getKey());
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
