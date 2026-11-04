<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

/**
 * La sesión superó el tiempo de inactividad configurado por el tenant.
 */
class SesionInactivaException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('Tu sesión se cerró por inactividad.');
    }

    public function errorCode(): string
    {
        return 'sesion_inactiva';
    }

    public function status(): int
    {
        return 401;
    }
}
