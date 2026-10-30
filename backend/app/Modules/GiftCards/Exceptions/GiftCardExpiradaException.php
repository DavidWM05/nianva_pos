<?php

namespace App\Modules\GiftCards\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class GiftCardExpiradaException extends ExcepcionNegocio
{
    public function __construct(string $codigo)
    {
        parent::__construct("La Gift Card {$codigo} está expirada.");
    }

    public function errorCode(): string
    {
        return 'gift_card_expirada';
    }
}
