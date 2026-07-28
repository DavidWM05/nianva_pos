<?php

namespace App\Modules\Cotizaciones\Exceptions;

use RuntimeException;

class CotizacionYaConvertidaException extends RuntimeException
{
    public function __construct(int $cotizacionId)
    {
        parent::__construct("La cotización {$cotizacionId} ya fue convertida en venta.");
    }
}
