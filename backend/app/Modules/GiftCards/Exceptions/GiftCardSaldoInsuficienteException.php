<?php

namespace App\Modules\GiftCards\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class GiftCardSaldoInsuficienteException extends ExcepcionNegocio
{
    public function __construct(string $codigo = '')
    {
        parent::__construct("Saldo insuficiente en la Gift Card {$codigo}.");
    }

    public function errorCode(): string
    {
        return 'gift_card_saldo_insuficiente';
    }
}
