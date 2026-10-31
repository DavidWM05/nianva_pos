<?php

namespace App\Modules\Tpv\Dtos;

final readonly class PagoDto
{
    public function __construct(
        public int $metodoPagoId,
        public float $monto,
    ) {}
}
