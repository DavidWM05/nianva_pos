<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class PinCajaIntentosAgotadosException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('Se agotaron los intentos de PIN. Vuelve a iniciar sesión.');
    }

    public function errorCode(): string
    {
        return 'pin_caja_intentos_agotados';
    }

    public function status(): int
    {
        return 429;
    }
}
