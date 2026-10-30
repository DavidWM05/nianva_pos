<?php

namespace App\Modules\CuentasCobrar\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuentaAnuladaException extends ExcepcionNegocio
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por cobrar {$cuentaId} está anulada.");
    }

    public function errorCode(): string
    {
        return 'cuenta_anulada';
    }
}
