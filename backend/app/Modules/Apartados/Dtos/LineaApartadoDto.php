<?php

namespace App\Modules\Apartados\Dtos;

final readonly class LineaApartadoDto
{
    public function __construct(
        public int $varianteId,
        public int $cantidad,
    ) {}
}
