<?php

namespace App\Modules\Produccion\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class StockInsumosInsuficienteException extends ExcepcionNegocio
{
    public function __construct(string $insumoNombre)
    {
        parent::__construct("Stock insuficiente del insumo '{$insumoNombre}' para la cantidad programada.");
    }

    public function errorCode(): string
    {
        return 'stock_insumos_insuficiente';
    }
}
