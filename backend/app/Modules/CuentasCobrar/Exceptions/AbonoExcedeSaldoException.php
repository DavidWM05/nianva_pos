<?php

namespace App\Modules\CuentasCobrar\Exceptions;

use RuntimeException;

class AbonoExcedeSaldoException extends RuntimeException
{
    public float $saldoPendiente;
    public float $montoAbono;

    public function __construct(float $saldoPendiente, float $montoAbono)
    {
        parent::__construct("El monto del abono ({$montoAbono}) excede el saldo pendiente ({$saldoPendiente}).");
        $this->saldoPendiente = $saldoPendiente;
        $this->montoAbono = $montoAbono;
    }
}
