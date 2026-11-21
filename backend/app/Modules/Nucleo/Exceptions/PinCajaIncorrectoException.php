<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class PinCajaIncorrectoException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('El PIN de caja es incorrecto.');
    }

    public function errorCode(): string
    {
        return 'pin_caja_incorrecto';
    }

    public function status(): int
    {
        return 422;
    }
}
