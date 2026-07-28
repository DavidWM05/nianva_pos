<?php

namespace App\Modules\GiftCards\Exceptions;

use RuntimeException;

class GiftCardSaldoInsuficienteException extends RuntimeException
{
    public function __construct(string $codigo = '')
    {
        parent::__construct("Saldo insuficiente en la Gift Card {$codigo}.");
    }
}
