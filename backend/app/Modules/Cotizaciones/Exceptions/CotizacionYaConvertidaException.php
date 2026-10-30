<?php

namespace App\Modules\Cotizaciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CotizacionYaConvertidaException extends ExcepcionNegocio
{
    public function __construct(int $cotizacionId)
    {
        parent::__construct("La cotización {$cotizacionId} ya fue convertida en venta.");
    }

    public function errorCode(): string
    {
        return 'cotizacion_ya_convertida';
    }
}
