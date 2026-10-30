<?php

namespace App\Modules\Delivery\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class TransicionEstadoInvalidaException extends ExcepcionNegocio
{
    public function __construct(string $estadoActual, string $nuevoEstado)
    {
        parent::__construct("No se puede cambiar el estado de '{$estadoActual}' a '{$nuevoEstado}'.");
    }

    public function errorCode(): string
    {
        return 'transicion_estado_invalida';
    }
}
