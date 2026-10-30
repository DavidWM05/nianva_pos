<?php

namespace App\Modules\Devoluciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class DevolucionSobreVentaSombraException extends ExcepcionNegocio
{
    public function __construct(public readonly int $ventaId)
    {
        parent::__construct(
            "La venta {$ventaId} es una venta sombra (generada por un cambio anterior): no puede ".
            "ser el origen de una devolucion normal, solo de un cambio recursivo (tipo='cambio')."
        );
    }

    public function errorCode(): string
    {
        return 'devolucion_sobre_venta_sombra';
    }

    public function contexto(): array
    {
        return [
            'venta_id' => $this->ventaId,
        ];
    }
}
