<?php

namespace App\Modules\CrmAvanzado\Exceptions;

use RuntimeException;

class PuntosInsuficientesException extends RuntimeException
{
    public function __construct(int $puntosDisponibles = 0)
    {
        parent::__construct("El cliente no tiene suficientes puntos disponibles ({$puntosDisponibles}) para este ajuste.");
    }
}
