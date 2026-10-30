<?php

namespace App\Modules\GiftCards\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class GiftCardCanceladaException extends ExcepcionNegocio
{
    public function __construct(string $codigo)
    {
        parent::__construct("La Gift Card {$codigo} está cancelada.");
    }

    public function errorCode(): string
    {
        return 'gift_card_cancelada';
    }
}
