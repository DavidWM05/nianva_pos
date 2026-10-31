<?php

namespace App\Modules\Devoluciones\Dtos;

final readonly class PagoDevolucionDto
{
    public function __construct(
        public int $metodoPagoId,
        public float $monto,
    ) {}
}
