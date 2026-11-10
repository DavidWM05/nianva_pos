<?php

declare(strict_types=1);

namespace App\Modules\Precios\Dtos;

final readonly class ValidarCuponDto
{
    public function __construct(
        public string $codigo,
        public float $total,
        public ?int $sucursalId,
    ) {}
}
