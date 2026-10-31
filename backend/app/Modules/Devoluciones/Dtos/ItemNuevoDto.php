<?php

namespace App\Modules\Devoluciones\Dtos;

final readonly class ItemNuevoDto
{
    public function __construct(
        public int $varianteId,
        public int $cantidad,
    ) {}
}
