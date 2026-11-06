<?php

declare(strict_types=1);

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
        $this->exigirTransaccion();

        if (round((float) ($data['monto'] ?? 0), 2) <= 0) {
            throw new MontoInvalidoException;
        }

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

    }

    public function recargarConTarjeta(GiftCard $giftCard, float $monto, int $usuarioId, ?int $cajaSesionId = null): GiftCard
    {
        $this->exigirTransaccion();

        if ($monto <= 0) {
            throw new MontoInvalidoException;
        }

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

        return $giftCard->refresh();

    }

    public function cancelarConTarjeta(GiftCard $giftCard): void
    {
        $this->exigirTransaccion();

        if ($giftCard->estado === 'cancelada') {
            throw new GiftCardYaCanceladaException($giftCard->codigo);
        }

        $giftCard->update(['estado' => 'cancelada']);

    }

    public function descontarSaldoConTarjeta(GiftCard $giftCard, float $monto): void
    {
        $this->exigirTransaccion();

        $nuevoSaldo = round((float) $giftCard->saldo_actual - $monto, 2);

        if ($nuevoSaldo < 0) {
            throw new GiftCardSaldoInsuficienteException($giftCard->codigo);
        }

        $giftCard->update([
            'saldo_actual' => $nuevoSaldo,
            'estado' => $nuevoSaldo <= 0 ? 'usada' : 'activa',
        ]);

    }

    public function validarParaPago(string $codigo): GiftCard
    {
        return $this->validarTarjetaParaPago(GiftCard::query()->where('codigo', $codigo)->firstOrFail());
    }

    public function validarTarjetaParaPago(GiftCard $giftCard): GiftCard
    {
        $codigo = (string) $giftCard->getAttribute('codigo');

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

    /** El modelo recibido debe haberse leído con bloqueo en la Action llamadora. */
    private function exigirTransaccion(): void
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('La escritura de saldos requiere una transacción activa.');
        }
    }
}
