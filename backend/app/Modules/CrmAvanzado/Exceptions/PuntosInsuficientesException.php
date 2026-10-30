<?php

namespace App\Modules\CrmAvanzado\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PuntosInsuficientesException extends ExcepcionNegocio
{
    public function __construct(int $puntosDisponibles = 0)
    {
        parent::__construct("El cliente no tiene suficientes puntos disponibles ({$puntosDisponibles}) para este ajuste.");
    }

    public function errorCode(): string
    {
        return 'puntos_insuficientes';
    }
}
