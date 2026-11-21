<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class SupervisorIntentosAgotadosException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('Se agotaron los intentos de autorización.');
    }

    public function errorCode(): string
    {
        return 'supervisor_intentos_agotados';
    }

    public function status(): int
    {
        return 429;
    }
}
