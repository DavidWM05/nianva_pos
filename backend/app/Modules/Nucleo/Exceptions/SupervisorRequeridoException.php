<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class SupervisorRequeridoException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('Esta operación requiere autorización de supervisor.');
    }

    public function errorCode(): string
    {
        return 'supervisor_requerido';
    }

    public function status(): int
    {
        return 403;
    }
}
