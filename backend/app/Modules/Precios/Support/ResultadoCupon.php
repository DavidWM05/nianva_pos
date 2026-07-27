<?php

namespace App\Modules\Precios\Support;

use App\Modules\Precios\Models\Cupon;

/**
 * Resultado de aplicar un cupon sobre el TOTAL del carrito -- deliberadamente
 * separado de ResultadoDescuento (reglas_precio). Nunca se mezclan: un
 * cupon no se resuelve por variante ni compite con la cascada de
 * reglas_precio, se calcula una sola vez sobre el total ya con los
 * descuentos de item aplicados.
 */
final class ResultadoCupon
{
    public function __construct(
        public readonly Cupon $cupon,
        public readonly float $totalCarrito,
        public readonly float $descuento,
    ) {
    }

    public function totalConDescuento(): float
    {
        return round($this->totalCarrito - $this->descuento, 2);
    }
}
