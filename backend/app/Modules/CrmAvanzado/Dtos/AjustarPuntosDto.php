<?php

namespace App\Modules\CrmAvanzado\Dtos;

final readonly class AjustarPuntosDto
{
    public function __construct(
        public int $puntos,
        public string $motivo,
    ) {}
}
