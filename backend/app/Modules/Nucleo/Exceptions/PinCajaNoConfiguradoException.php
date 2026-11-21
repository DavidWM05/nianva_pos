<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class PinCajaNoConfiguradoException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('Configura tu PIN antes de bloquear la sesión.');
    }

    public function errorCode(): string
    {
        return 'pin_caja_no_configurado';
    }

    public function status(): int
    {
        return 409;
    }
}
