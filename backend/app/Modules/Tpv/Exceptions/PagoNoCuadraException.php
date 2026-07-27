<?php

namespace App\Modules\Tpv\Exceptions;

use RuntimeException;

class PagoNoCuadraException extends RuntimeException
{
    public function __construct(public readonly float $total, public readonly float $sumaPagos)
    {
        parent::__construct(
            "La suma de los pagos ({$sumaPagos}) no coincide con el total de la venta ({$total})."
        );
    }
}
