<?php

namespace App\Modules\Nucleo\Exceptions;

/**
 * La sucursal solicitada no pertenece al tenant del usuario, o el usuario no
 * tiene el permiso sucursales.todas para operar en una sucursal distinta.
 */
class SucursalNoPermitidaException extends ExcepcionNegocio
{
    public function __construct(private readonly int $sucursalId)
    {
        parent::__construct("La sucursal {$sucursalId} no esta permitida para este usuario.");
    }

    public function errorCode(): string
    {
        return 'sucursal_no_permitida';
    }

    /**
     * @return array{sucursal_id: int}
     */
    public function contexto(): array
    {
        return ['sucursal_id' => $this->sucursalId];
    }
}
