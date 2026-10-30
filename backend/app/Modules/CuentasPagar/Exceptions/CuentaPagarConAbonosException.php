<?php

namespace App\Modules\CuentasPagar\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuentaPagarConAbonosException extends ExcepcionNegocio
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por pagar {$cuentaId} tiene pagos registrados y no se puede anular.");
    }

    public function errorCode(): string
    {
        return 'cuenta_pagar_con_abonos';
    }
}
