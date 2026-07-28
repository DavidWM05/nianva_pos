<?php

namespace App\Modules\GiftCards\Exceptions;

use RuntimeException;

class MontoInvalidoException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('El monto debe ser mayor a cero.');
    }
}
