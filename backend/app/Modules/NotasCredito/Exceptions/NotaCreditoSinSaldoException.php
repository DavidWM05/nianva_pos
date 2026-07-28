<?php

namespace App\Modules\NotasCredito\Exceptions;

use RuntimeException;

class NotaCreditoSinSaldoException extends RuntimeException
{
    public function __construct(int $notaCreditoId)
    {
        parent::__construct("La nota de crédito {$notaCreditoId} no tiene saldo disponible.");
    }
}
