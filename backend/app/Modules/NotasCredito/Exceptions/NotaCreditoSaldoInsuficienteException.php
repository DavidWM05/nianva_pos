<?php

namespace App\Modules\NotasCredito\Exceptions;

use RuntimeException;

class NotaCreditoSaldoInsuficienteException extends RuntimeException
{
    public function __construct(int $notaCreditoId = 0)
    {
        parent::__construct("La nota de crédito {$notaCreditoId} no tiene saldo suficiente para el monto solicitado.");
    }
}
