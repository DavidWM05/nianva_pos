<?php

namespace App\Modules\GiftCards\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class GiftCardYaCanceladaException extends ExcepcionNegocio
{
    public function __construct(string $codigo = '')
    {
        parent::__construct("La Gift Card {$codigo} ya está cancelada.");
    }

    public function errorCode(): string
    {
        return 'gift_card_ya_cancelada';
    }
}
