<?php

namespace App\Modules\NotasCredito\Exceptions;

use RuntimeException;

class NotaCreditoExpiradaException extends RuntimeException
{
    public function __construct(int $notaCreditoId)
    {
        parent::__construct("La nota de crédito {$notaCreditoId} está expirada.");
    }
}
