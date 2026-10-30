<?php

namespace App\Modules\Payroll\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class SinEmpleadosException extends ExcepcionNegocio
{
    public function __construct(int $sucursalId = 0)
    {
        parent::__construct("No hay empleados activos en la sucursal {$sucursalId} para generar la nómina.");
    }

    public function errorCode(): string
    {
        return 'sin_empleados';
    }
}
