<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

final readonly class CotizacionPrecio
{
    /**
     * @param  list<LineaPrecio>  $lineas
     * @param  float  $subtotal  Suma de las líneas con sus descuentos, antes del cupón.
     */
    public function __construct(public array $lineas, public float $subtotal, public ?CuponAplicado $cupon, public float $total) {}
}
