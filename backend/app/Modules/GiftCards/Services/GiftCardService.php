<?php

namespace App\Modules\GiftCards\Services;

use App\Modules\GiftCards\Exceptions\GiftCardCanceladaException;
use App\Modules\GiftCards\Exceptions\GiftCardExpiradaException;
use App\Modules\GiftCards\Exceptions\GiftCardSaldoInsuficienteException;
use App\Modules\GiftCards\Exceptions\GiftCardSinSaldoException;
use App\Modules\GiftCards\Exceptions\GiftCardYaCanceladaException;
use App\Modules\GiftCards\Exceptions\MontoInvalidoException;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Models\GiftCardRecarga;
use Illuminate\Support\Facades\DB;

class GiftCardService
{
    public function emitir(array $data): GiftCard
    {
        if (round((float) ($data['monto'] ?? 0), 2) <= 0) {
            throw new MontoInvalidoException;
        }

        return DB::transaction(function () use ($data) {
            $codigo = $this->generarCodigo($data['tenant_id']);

            return GiftCard::create([
                'tenant_id' => $data['tenant_id'],
                'cliente_id' => $data['cliente_id'] ?? null,
                'codigo' => $codigo,
                'saldo_inicial' => round((float) $data['monto'], 2),
                'saldo_actual' => round((float) $data['monto'], 2),
                'fecha_expiracion' => $data['fecha_expiracion'] ?? null,
                'estado' => 'activa',
            ]);
        });
    }

    public function recargar(int $id, float $monto, int $usuarioId, ?int $cajaSesionId = null): GiftCard
    {
        if ($monto <= 0) {
            throw new MontoInvalidoException;
        }

        return DB::transaction(function () use ($id, $monto, $usuarioId, $cajaSesionId) {
            $giftCard = GiftCard::where('id', $id)->lockForUpdate()->firstOrFail();

            if ($giftCard->estado === 'expirada' || ($giftCard->fecha_expiracion && $giftCard->fecha_expiracion < now()->toDateString())) {
                throw new GiftCardExpiradaException($giftCard->codigo);
            }

            if ($giftCard->estado === 'cancelada') {
                throw new GiftCardCanceladaException($giftCard->codigo);
            }

            GiftCardRecarga::create([
                'gift_card_id' => $giftCard->id,
                'caja_sesion_id' => $cajaSesionId,
                'monto' => $monto,
                'usuario_id' => $usuarioId,
            ]);

            $giftCard->increment('saldo_actual', $monto);

            return $giftCard->fresh();
        });
    }

    public function cancelar(int $id): void
    {
        DB::transaction(function () use ($id) {
            $giftCard = GiftCard::where('id', $id)->lockForUpdate()->firstOrFail();

            if ($giftCard->estado === 'cancelada') {
                throw new GiftCardYaCanceladaException($giftCard->codigo);
            }

            $giftCard->update(['estado' => 'cancelada']);
        });
    }

    public function descontarSaldo(int $id, float $monto): void
    {
        DB::transaction(function () use ($id, $monto) {
            $giftCard = GiftCard::where('id', $id)->lockForUpdate()->firstOrFail();

            $nuevoSaldo = round((float) $giftCard->saldo_actual - $monto, 2);

            if ($nuevoSaldo < 0) {
                throw new GiftCardSaldoInsuficienteException($giftCard->codigo);
            }

            $giftCard->update([
                'saldo_actual' => $nuevoSaldo,
                'estado' => $nuevoSaldo <= 0 ? 'usada' : 'activa',
            ]);
        });
    }

    public function validarParaPago(string $codigo): GiftCard
    {
        $giftCard = GiftCard::where('codigo', $codigo)->firstOrFail();

        if ($giftCard->estado === 'expirada' || ($giftCard->fecha_expiracion && $giftCard->fecha_expiracion < now()->toDateString())) {
            throw new GiftCardExpiradaException($codigo);
        }

        if ($giftCard->estado === 'cancelada') {
            throw new GiftCardCanceladaException($codigo);
        }

        if ((float) $giftCard->saldo_actual <= 0) {
            throw new GiftCardSinSaldoException($codigo);
        }

        return $giftCard;
    }

    private function generarCodigo(int $tenantId): string
    {
        $random = substr(str_shuffle('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 8);

        return "GC-{$tenantId}-{$random}";
    }
}
