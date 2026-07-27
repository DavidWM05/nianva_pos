<?php

namespace App\Modules\Tpv\Exceptions;

use RuntimeException;

class CajaSesionNoAbiertaException extends RuntimeException
{
    public function __construct(public readonly int $sucursalId)
    {
        parent::__construct("No hay una caja abierta para la sucursal {$sucursalId}.");
    }
}
