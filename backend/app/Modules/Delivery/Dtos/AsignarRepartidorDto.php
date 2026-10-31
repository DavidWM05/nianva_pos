<?php

namespace App\Modules\Delivery\Dtos;

final readonly class AsignarRepartidorDto
{
    public function __construct(
        public int $repartidorId,
    ) {}
}
