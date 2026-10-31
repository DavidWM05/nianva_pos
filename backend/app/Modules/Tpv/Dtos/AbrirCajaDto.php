<?php

namespace App\Modules\Tpv\Dtos;

final readonly class AbrirCajaDto
{
    public function __construct(
        public float $montoApertura,
    ) {}
}
