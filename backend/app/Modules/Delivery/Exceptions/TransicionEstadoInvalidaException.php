<?php

namespace App\Modules\Delivery\Exceptions;

use RuntimeException;

class TransicionEstadoInvalidaException extends RuntimeException
{
    public function __construct(string $estadoActual, string $nuevoEstado)
    {
        parent::__construct("No se puede cambiar el estado de '{$estadoActual}' a '{$nuevoEstado}'.");
    }
}
