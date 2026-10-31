<?php

namespace App\Modules\Precios\Dtos;

final readonly class ValidarCuponDto
{
    public function __construct(
        public string $codigo,
        public float $total,
    ) {}
}
