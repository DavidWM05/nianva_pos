<?php

namespace App\Modules\Delivery\Exceptions;

use RuntimeException;

class PedidoNoAsignableException extends RuntimeException
{
    public function __construct(int $pedidoId, string $estadoActual)
    {
        parent::__construct("No se puede asignar repartidor al pedido {$pedidoId} porque su estado es '{$estadoActual}'.");
    }
}
