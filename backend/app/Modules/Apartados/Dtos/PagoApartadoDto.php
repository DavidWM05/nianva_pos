<?php

namespace App\Modules\Apartados\Dtos;

final readonly class PagoApartadoDto
{
    public function __construct(
        public int $metodoPagoId,
        public float $monto,
    ) {}
}
