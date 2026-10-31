<?php

namespace App\Modules\Tpv\Dtos;

final readonly class CerrarCajaDto
{
    public function __construct(
        public float $montoFisico,
    ) {}
}
