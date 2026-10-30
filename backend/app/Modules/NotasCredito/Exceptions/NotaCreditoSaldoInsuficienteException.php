<?php

namespace App\Modules\NotasCredito\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class NotaCreditoSaldoInsuficienteException extends ExcepcionNegocio
{
    public function __construct(int $notaCreditoId = 0)
    {
        parent::__construct("La nota de crédito {$notaCreditoId} no tiene saldo suficiente para el monto solicitado.");
    }

    public function errorCode(): string
    {
        return 'nota_credito_saldo_insuficiente';
    }
}
