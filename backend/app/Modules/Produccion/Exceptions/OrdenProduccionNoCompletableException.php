<?php

namespace App\Modules\Produccion\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class OrdenProduccionNoCompletableException extends ExcepcionNegocio
{
    public function __construct(int $ordenId, string $estadoActual)
    {
        parent::__construct("La orden de producción {$ordenId} no se puede completar desde el estado '{$estadoActual}'.");
    }

    public function errorCode(): string
    {
        return 'orden_produccion_no_completable';
    }
}
