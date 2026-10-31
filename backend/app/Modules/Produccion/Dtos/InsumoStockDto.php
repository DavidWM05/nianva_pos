<?php

namespace App\Modules\Produccion\Dtos;

final readonly class InsumoStockDto
{
    public function __construct(
        public int $sucursalId,
        public float $cantidad,
        public ?string $lote,
        public ?string $fechaVencimiento,
    ) {}
}
