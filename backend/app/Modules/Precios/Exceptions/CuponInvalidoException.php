<?php

namespace App\Modules\Precios\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuponInvalidoException extends ExcepcionNegocio
{
    public function __construct(public readonly string $codigo)
    {
        parent::__construct("El cupon '{$codigo}' no existe, esta inactivo o esta fuera de su vigencia.");
    }

    public function errorCode(): string
    {
        return 'cupon_invalido';
    }

    public function contexto(): array
    {
        return [
            'codigo' => $this->codigo,
        ];
    }
}
