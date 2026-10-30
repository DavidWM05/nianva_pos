<?php

namespace App\Modules\GiftCards\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class MontoInvalidoException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('El monto debe ser mayor a cero.');
    }

    public function errorCode(): string
    {
        return 'monto_invalido';
    }
}
