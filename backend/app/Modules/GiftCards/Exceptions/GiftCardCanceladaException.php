<?php

namespace App\Modules\GiftCards\Exceptions;

use RuntimeException;

class GiftCardCanceladaException extends RuntimeException
{
    public function __construct(string $codigo)
    {
        parent::__construct("La Gift Card {$codigo} está cancelada.");
    }
}
