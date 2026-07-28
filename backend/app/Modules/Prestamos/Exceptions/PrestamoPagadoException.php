<?php

namespace App\Modules\Prestamos\Exceptions;

use RuntimeException;

class PrestamoPagadoException extends RuntimeException
{
    public function __construct(int $prestamoId = 0)
    {
        parent::__construct("El préstamo {$prestamoId} ya está pagado.");
    }
}
