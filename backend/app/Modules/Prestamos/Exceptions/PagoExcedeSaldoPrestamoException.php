<?php

namespace App\Modules\Prestamos\Exceptions;

use RuntimeException;

class PagoExcedeSaldoPrestamoException extends RuntimeException
{
    public float $saldoPendiente;
    public float $montoPago;

    public function __construct(float $saldoPendiente, float $montoPago)
    {
        parent::__construct("El pago ({$montoPago}) excede el saldo pendiente ({$saldoPendiente}) del préstamo.");
        $this->saldoPendiente = $saldoPendiente;
        $this->montoPago = $montoPago;
    }
}
