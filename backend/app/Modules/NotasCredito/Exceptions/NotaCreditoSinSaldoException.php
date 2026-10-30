<?php

namespace App\Modules\NotasCredito\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class NotaCreditoSinSaldoException extends ExcepcionNegocio
{
    public function __construct(int $notaCreditoId)
    {
        parent::__construct("La nota de crédito {$notaCreditoId} no tiene saldo disponible.");
    }

    public function errorCode(): string
    {
        return 'nota_credito_sin_saldo';
    }
}
