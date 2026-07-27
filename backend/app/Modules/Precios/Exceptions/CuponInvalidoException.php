<?php

namespace App\Modules\Precios\Exceptions;

use RuntimeException;

class CuponInvalidoException extends RuntimeException
{
    public function __construct(public readonly string $codigo)
    {
        parent::__construct("El cupon '{$codigo}' no existe, esta inactivo o esta fuera de su vigencia.");
    }
}
