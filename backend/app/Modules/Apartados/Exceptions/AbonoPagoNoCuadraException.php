<?php

namespace App\Modules\Apartados\Exceptions;

use RuntimeException;

class AbonoPagoNoCuadraException extends RuntimeException
{
    public function __construct(public readonly float $monto, public readonly float $sumaPagos)
    {
        parent::__construct(
            "La suma de los pagos ({$sumaPagos}) no coincide con el monto del abono ({$monto})."
        );
    }
}
