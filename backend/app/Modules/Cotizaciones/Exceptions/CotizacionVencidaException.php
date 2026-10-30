<?php

namespace App\Modules\Cotizaciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CotizacionVencidaException extends ExcepcionNegocio
{
    public function __construct(int $cotizacionId)
    {
        parent::__construct("La cotización {$cotizacionId} está vencida y no se puede convertir en venta.");
    }

    public function errorCode(): string
    {
        return 'cotizacion_vencida';
    }
}
