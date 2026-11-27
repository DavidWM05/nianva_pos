<?php

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CajaYaAbiertaException extends ExcepcionNegocio
{
    public function __construct(public readonly int $sucursalId, public readonly int $terminalId)
    {
        parent::__construct("Ya hay una caja abierta para la terminal {$terminalId}.");
    }

    public function errorCode(): string
    {
        return 'caja_ya_abierta';
    }

    public function contexto(): array
    {
        return [
            'sucursal_id' => $this->sucursalId,
            'terminal_id' => $this->terminalId,
        ];
    }
}
