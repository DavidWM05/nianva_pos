<?php

namespace App\Modules\Produccion\Exceptions;

use RuntimeException;

class StockInsumosInsuficienteException extends RuntimeException
{
    public function __construct(string $insumoNombre)
    {
        parent::__construct("Stock insuficiente del insumo '{$insumoNombre}' para la cantidad programada.");
    }
}
