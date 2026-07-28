<?php

namespace App\Modules\CuentasCobrar\Exceptions;

use RuntimeException;

class CuentaAnuladaException extends RuntimeException
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por cobrar {$cuentaId} está anulada.");
    }
}
