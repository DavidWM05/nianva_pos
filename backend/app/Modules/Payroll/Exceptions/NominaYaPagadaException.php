<?php

namespace App\Modules\Payroll\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class NominaYaPagadaException extends ExcepcionNegocio
{
    public function __construct(int $nominaId = 0)
    {
        parent::__construct("La nómina {$nominaId} ya está pagada.");
    }

    public function errorCode(): string
    {
        return 'nomina_ya_pagada';
    }
}
