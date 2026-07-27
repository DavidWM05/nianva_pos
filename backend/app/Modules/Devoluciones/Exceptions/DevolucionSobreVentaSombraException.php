<?php

namespace App\Modules\Devoluciones\Exceptions;

use RuntimeException;

class DevolucionSobreVentaSombraException extends RuntimeException
{
    public function __construct(public readonly int $ventaId)
    {
        parent::__construct(
            "La venta {$ventaId} es una venta sombra (generada por un cambio anterior): no puede ".
            "ser el origen de una devolucion normal, solo de un cambio recursivo (tipo='cambio')."
        );
    }
}
