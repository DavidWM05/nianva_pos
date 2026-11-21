<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class ConflictoIdempotenciaException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('La llave de idempotencia ya se usó para otra operación.');
    }

    public function errorCode(): string
    {
        return 'idempotencia_conflicto';
    }

    public function status(): int
    {
        return 409;
    }
}
