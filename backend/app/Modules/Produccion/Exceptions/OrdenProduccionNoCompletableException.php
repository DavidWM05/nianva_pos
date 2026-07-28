<?php

namespace App\Modules\Produccion\Exceptions;

use RuntimeException;

class OrdenProduccionNoCompletableException extends RuntimeException
{
    public function __construct(int $ordenId, string $estadoActual)
    {
        parent::__construct("La orden de producción {$ordenId} no se puede completar desde el estado '{$estadoActual}'.");
    }
}
