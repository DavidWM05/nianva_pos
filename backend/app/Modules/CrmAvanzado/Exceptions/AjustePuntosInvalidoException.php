<?php

namespace App\Modules\CrmAvanzado\Exceptions;

use RuntimeException;

class AjustePuntosInvalidoException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('El ajuste de puntos no puede ser cero.');
    }
}
