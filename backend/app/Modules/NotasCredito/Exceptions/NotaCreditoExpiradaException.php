<?php

namespace App\Modules\NotasCredito\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class NotaCreditoExpiradaException extends ExcepcionNegocio
{
    public function __construct(int $notaCreditoId)
    {
        parent::__construct("La nota de crédito {$notaCreditoId} está expirada.");
    }

    public function errorCode(): string
    {
        return 'nota_credito_expirada';
    }
}
