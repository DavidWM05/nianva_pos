<?php

namespace App\Modules\CuentasCobrar\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuentaYaPagadaException extends ExcepcionNegocio
{
    public function __construct(int $cuentaId)
    {
        parent::__construct("La cuenta por cobrar {$cuentaId} ya está pagada.");
    }

    public function errorCode(): string
    {
        return 'cuenta_ya_pagada';
    }
}
