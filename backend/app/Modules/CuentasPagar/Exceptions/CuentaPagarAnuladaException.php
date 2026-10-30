<?php

namespace App\Modules\CuentasPagar\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuentaPagarAnuladaException extends ExcepcionNegocio
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por pagar {$cuentaId} está anulada.");
    }

    public function errorCode(): string
    {
        return 'cuenta_pagar_anulada';
    }
}
