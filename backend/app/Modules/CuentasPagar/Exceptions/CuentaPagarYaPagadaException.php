<?php

namespace App\Modules\CuentasPagar\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuentaPagarYaPagadaException extends ExcepcionNegocio
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por pagar {$cuentaId} ya está pagada.");
    }

    public function errorCode(): string
    {
        return 'cuenta_pagar_ya_pagada';
    }
}
