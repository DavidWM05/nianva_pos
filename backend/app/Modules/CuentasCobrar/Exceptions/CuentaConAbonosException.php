<?php

namespace App\Modules\CuentasCobrar\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuentaConAbonosException extends ExcepcionNegocio
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por cobrar {$cuentaId} tiene abonos registrados y no se puede anular.");
    }

    public function errorCode(): string
    {
        return 'cuenta_con_abonos';
    }
}
