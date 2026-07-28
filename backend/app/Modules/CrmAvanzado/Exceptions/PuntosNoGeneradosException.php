<?php

namespace App\Modules\CrmAvanzado\Exceptions;

use RuntimeException;

class PuntosNoGeneradosException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('El total de la venta no genera puntos de fidelidad.');
    }
}
