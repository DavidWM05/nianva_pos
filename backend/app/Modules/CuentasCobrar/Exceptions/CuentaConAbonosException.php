<?php

namespace App\Modules\CuentasCobrar\Exceptions;

use RuntimeException;

class CuentaConAbonosException extends RuntimeException
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por cobrar {$cuentaId} tiene abonos registrados y no se puede anular.");
    }
}
