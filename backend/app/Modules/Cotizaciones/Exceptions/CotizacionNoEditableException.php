<?php

namespace App\Modules\Cotizaciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CotizacionNoEditableException extends ExcepcionNegocio
{
    public function __construct(int $cotizacionId, string $estadoActual)
    {
        parent::__construct("La cotización {$cotizacionId} no se puede editar porque su estado es '{$estadoActual}'.");
    }

    public function errorCode(): string
    {
        return 'cotizacion_no_editable';
    }
}
