<?php

namespace App\Modules\Nucleo\Exceptions;

/**
 * La operacion necesita una sucursal y ni el usuario ni el request la aportan.
 */
class SucursalRequeridaException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('La operacion requiere una sucursal y el usuario no tiene una asignada.');
    }

    public function errorCode(): string
    {
        return 'sucursal_requerida';
    }
}
