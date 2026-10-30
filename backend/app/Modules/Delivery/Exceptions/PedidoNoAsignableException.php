<?php

namespace App\Modules\Delivery\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PedidoNoAsignableException extends ExcepcionNegocio
{
    public function __construct(int $pedidoId, string $estadoActual)
    {
        parent::__construct("No se puede asignar repartidor al pedido {$pedidoId} porque su estado es '{$estadoActual}'.");
    }

    public function errorCode(): string
    {
        return 'pedido_no_asignable';
    }
}
