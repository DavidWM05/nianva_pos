<?php

namespace App\Modules\Cotizaciones\Exceptions;

use RuntimeException;

class CotizacionVencidaException extends RuntimeException
{
    public function __construct(int $cotizacionId)
    {
        parent::__construct("La cotización {$cotizacionId} está vencida y no se puede convertir en venta.");
    }
}
