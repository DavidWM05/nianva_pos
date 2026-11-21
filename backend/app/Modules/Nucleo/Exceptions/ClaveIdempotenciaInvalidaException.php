<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class ClaveIdempotenciaInvalidaException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('Idempotency-Key debe ser un ULID.');
    }

    public function errorCode(): string
    {
        return 'idempotencia_clave_invalida';
    }

    public function status(): int
    {
        return 422;
    }
}
