<?php

namespace App\Modules\Cotizaciones\Exceptions;

use RuntimeException;

class CotizacionNoEditableException extends RuntimeException
{
    public function __construct(int $cotizacionId, string $estadoActual)
    {
        parent::__construct("La cotización {$cotizacionId} no se puede editar porque su estado es '{$estadoActual}'.");
    }
}
