<?php

namespace App\Modules\CrmAvanzado\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class AjustePuntosInvalidoException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('El ajuste de puntos no puede ser cero.');
    }

    public function errorCode(): string
    {
        return 'ajuste_puntos_invalido';
    }
}
