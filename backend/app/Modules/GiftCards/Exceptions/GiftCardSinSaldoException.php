<?php

namespace App\Modules\GiftCards\Exceptions;

use RuntimeException;

class GiftCardSinSaldoException extends RuntimeException
{
    public function __construct(string $codigo = '')
    {
        parent::__construct("La Gift Card {$codigo} no tiene saldo disponible.");
    }
}
