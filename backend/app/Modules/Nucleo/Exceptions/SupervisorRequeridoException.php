<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class SupervisorRequeridoException extends ExcepcionNegocio
{
    public function __construct(private readonly ?string $consolidadoId = null)
    {
        parent::__construct('Esta operación requiere autorización de supervisor.');
    }

    public function errorCode(): string
    {
        return 'supervisor_requerido';
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return $this->consolidadoId === null ? [] : ['consolidado_id' => $this->consolidadoId];
    }

    public function status(): int
    {
        return 403;
    }
}
