<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

class MetodoEfectivoNoExisteException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('No existe un método de efectivo del tenant ni el método global Efectivo.');
    }

    public function errorCode(): string
    {
        return 'metodo_efectivo_no_existe';
    }
}
