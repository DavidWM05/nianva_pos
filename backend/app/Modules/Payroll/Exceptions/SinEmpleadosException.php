<?php

namespace App\Modules\Payroll\Exceptions;

use RuntimeException;

class SinEmpleadosException extends RuntimeException
{
    public function __construct(int $sucursalId = 0)
    {
        parent::__construct("No hay empleados activos en la sucursal {$sucursalId} para generar la nómina.");
    }
}
