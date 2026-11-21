<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class SupervisorInvalidoException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('La autorización de supervisor no es válida.');
    }

    public function errorCode(): string
    {
        return 'supervisor_invalido';
    }

    public function status(): int
    {
        return 403;
    }
}
