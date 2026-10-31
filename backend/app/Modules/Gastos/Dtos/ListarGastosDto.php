<?php

namespace App\Modules\Gastos\Dtos;

final readonly class ListarGastosDto
{
    public function __construct(
        public int $cajaSesionId,
    ) {}
}
