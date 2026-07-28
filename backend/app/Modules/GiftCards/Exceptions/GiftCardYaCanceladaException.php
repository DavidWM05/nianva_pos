<?php

namespace App\Modules\GiftCards\Exceptions;

use RuntimeException;

class GiftCardYaCanceladaException extends RuntimeException
{
    public function __construct(string $codigo = '')
    {
        parent::__construct("La Gift Card {$codigo} ya está cancelada.");
    }
}
