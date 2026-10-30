<?php

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CajaYaCerradaException extends ExcepcionNegocio
{
    public function __construct(public readonly int $cajaSesionId)
    {
        parent::__construct("La caja {$cajaSesionId} ya esta cerrada.");
    }

    public function errorCode(): string
    {
        return 'caja_ya_cerrada';
    }

    public function contexto(): array
    {
        return [
            'caja_sesion_id' => $this->cajaSesionId,
        ];
    }
}
