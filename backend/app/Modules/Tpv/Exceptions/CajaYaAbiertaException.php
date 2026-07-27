<?php

namespace App\Modules\Tpv\Exceptions;

use RuntimeException;

class CajaYaAbiertaException extends RuntimeException
{
    public function __construct(public readonly int $sucursalId)
    {
        parent::__construct("Ya hay una caja abierta para la sucursal {$sucursalId}.");
    }
}
