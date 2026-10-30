<?php

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class VentaYaAnuladaException extends ExcepcionNegocio
{
    public function __construct(public readonly int $ventaId)
    {
        parent::__construct("La venta {$ventaId} ya esta anulada.");
    }

    public function errorCode(): string
    {
        return 'venta_ya_anulada';
    }

    public function contexto(): array
    {
        return [
            'venta_id' => $this->ventaId,
        ];
    }
}
