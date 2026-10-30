<?php

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CajaSesionNoAbiertaException extends ExcepcionNegocio
{
    public function __construct(public readonly int $sucursalId)
    {
        parent::__construct("No hay una caja abierta para la sucursal {$sucursalId}.");
    }

    public function errorCode(): string
    {
        return 'caja_no_abierta';
    }

    public function contexto(): array
    {
        return [
            'sucursal_id' => $this->sucursalId,
        ];
    }
}
