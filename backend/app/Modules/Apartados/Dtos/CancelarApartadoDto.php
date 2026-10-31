<?php

namespace App\Modules\Apartados\Dtos;

final readonly class CancelarApartadoDto
{
    public function __construct(
        public string $motivo,
    ) {}
}
