<?php

namespace App\Modules\Payroll\Exceptions;

use RuntimeException;

class EmpleadoYaExisteException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('El usuario ya está registrado como empleado.');
    }
}
