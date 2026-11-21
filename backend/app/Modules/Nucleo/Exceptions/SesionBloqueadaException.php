<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class SesionBloqueadaException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('La sesión está bloqueada.');
    }

    public function errorCode(): string
    {
        return 'sesion_bloqueada';
    }

    public function status(): int
    {
        return 423;
    }
}
