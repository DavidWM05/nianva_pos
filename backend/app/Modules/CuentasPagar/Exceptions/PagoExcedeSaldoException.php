<?php

namespace App\Modules\CuentasPagar\Exceptions;

use RuntimeException;

class PagoExcedeSaldoException extends RuntimeException
{
    public float $saldoPendiente;
    public float $montoPago;

    public function __construct(float $saldoPendiente, float $montoPago)
    {
        parent::__construct("El monto del pago ({$montoPago}) excede el saldo pendiente ({$saldoPendiente}).");
        $this->saldoPendiente = $saldoPendiente;
        $this->montoPago = $montoPago;
    }
}
