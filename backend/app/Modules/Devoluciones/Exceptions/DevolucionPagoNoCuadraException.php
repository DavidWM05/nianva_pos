<?php

namespace App\Modules\Devoluciones\Exceptions;

use RuntimeException;

class DevolucionPagoNoCuadraException extends RuntimeException
{
    public function __construct(public readonly float $diferencia, public readonly float $sumaPagos)
    {
        parent::__construct(
            "La suma de los pagos ({$sumaPagos}) no coincide con la diferencia a liquidar ({$diferencia})."
        );
    }
}
