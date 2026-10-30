<?php

namespace App\Modules\Prestamos\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PrestamoPagadoException extends ExcepcionNegocio
{
    public function __construct(int $prestamoId = 0)
    {
        parent::__construct("El préstamo {$prestamoId} ya está pagado.");
    }

    public function errorCode(): string
    {
        return 'prestamo_ya_pagado';
    }
}
