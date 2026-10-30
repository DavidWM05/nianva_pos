<?php

namespace App\Modules\Cotizaciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class SinClienteException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('La cotización no tiene un cliente asociado y no se puede convertir en venta.');
    }

    public function errorCode(): string
    {
        return 'sin_cliente';
    }
}
