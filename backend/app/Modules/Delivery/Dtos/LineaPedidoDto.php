<?php

namespace App\Modules\Delivery\Dtos;

final readonly class LineaPedidoDto
{
    public function __construct(
        public int $varianteId,
        public int $cantidad,
        public float $precioUnitario,
    ) {}
}
