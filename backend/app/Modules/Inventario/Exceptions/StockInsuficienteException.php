<?php

namespace App\Modules\Inventario\Exceptions;

use RuntimeException;

class StockInsuficienteException extends RuntimeException
{
    public function __construct(
        public readonly int $varianteId,
        public readonly int $sucursalId,
        public readonly int $solicitado,
        public readonly int $disponible,
    ) {
        parent::__construct(
            "Stock insuficiente para la variante {$varianteId} en la sucursal {$sucursalId}: ".
            "se solicitaron {$solicitado} unidades, hay {$disponible} disponibles."
        );
    }
}
