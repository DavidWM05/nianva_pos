<?php

namespace App\Modules\GiftCards\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class GiftCardSinSaldoException extends ExcepcionNegocio
{
    public function __construct(string $codigo = '')
    {
        parent::__construct("La Gift Card {$codigo} no tiene saldo disponible.");
    }

    public function errorCode(): string
    {
        return 'gift_card_sin_saldo';
    }
}
