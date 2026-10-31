<?php

namespace App\Modules\Tpv\Dtos;

final readonly class AnularVentaDto
{
    public function __construct(
        public string $motivo,
    ) {}
}
