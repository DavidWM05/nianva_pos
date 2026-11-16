<?php

namespace App\Modules\Devoluciones\Dtos;

final readonly class ItemDevueltoDto
{
    public function __construct(
        public int $varianteId,
        public int|float $cantidad,
        public bool $vaAMerma,
        public ?int $ventaDetalleId = null,
    ) {}
}
