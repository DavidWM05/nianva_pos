<?php

namespace App\Modules\CrmAvanzado\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PuntosNoGeneradosException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('El total de la venta no genera puntos de fidelidad.');
    }

    public function errorCode(): string
    {
        return 'puntos_no_generados';
    }
}
