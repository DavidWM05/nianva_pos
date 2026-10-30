<?php

namespace App\Modules\Payroll\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class EmpleadoYaExisteException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('El usuario ya está registrado como empleado.');
    }

    public function errorCode(): string
    {
        return 'empleado_ya_existe';
    }
}
