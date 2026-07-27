<?php

namespace App\Modules\Precios\Support;

use App\Modules\Precios\Models\ReglaPrecio;

/**
 * Resultado de aplicar (a lo sumo) una regla_precio a una linea de venta.
 * $regla es null cuando ninguna regla aplico -- eso es un resultado valido,
 * no un error.
 */
final class ResultadoDescuento
{
    public function __construct(
        public readonly ?ReglaPrecio $regla,
        public readonly float $precioUnitario,
        public readonly int $cantidad,
        public readonly float $descuentoTotal,
    ) {
    }

    public function subtotalSinDescuento(): float
    {
        return round($this->precioUnitario * $this->cantidad, 2);
    }

    public function subtotalConDescuento(): float
    {
        return round($this->subtotalSinDescuento() - $this->descuentoTotal, 2);
    }
}
