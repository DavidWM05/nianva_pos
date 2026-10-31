<?php

namespace App\Modules\Cotizaciones\Dtos;

final readonly class LineaCotizacionDto
{
    public function __construct(
        public int $varianteId,
        public int $cantidad,
        public float $precioUnitario,
        public float $descuento,
    ) {}
}
