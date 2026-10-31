<?php

namespace App\Modules\Inventario\Dtos;

final readonly class LineaCompraDto
{
    public function __construct(
        public int $varianteId,
        public int $cantidad,
        public float $precioCompra,
    ) {}
}
