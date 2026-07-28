<?php

namespace App\Modules\CuentasPagar\Exceptions;

use RuntimeException;

class CuentaPagarConAbonosException extends RuntimeException
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por pagar {$cuentaId} tiene pagos registrados y no se puede anular.");
    }
}
