<?php

namespace App\Modules\Cotizaciones\Exceptions;

use RuntimeException;

class SinClienteException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('La cotización no tiene un cliente asociado y no se puede convertir en venta.');
    }
}
