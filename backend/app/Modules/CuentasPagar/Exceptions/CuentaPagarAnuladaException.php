<?php

namespace App\Modules\CuentasPagar\Exceptions;

use RuntimeException;

class CuentaPagarAnuladaException extends RuntimeException
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por pagar {$cuentaId} está anulada.");
    }
}
