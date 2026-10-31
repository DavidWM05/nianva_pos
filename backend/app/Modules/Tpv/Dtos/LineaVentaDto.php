<?php

namespace App\Modules\Tpv\Dtos;

final readonly class LineaVentaDto
{
    public function __construct(
        public int $varianteId,
        public int $cantidad,
    ) {}
}
