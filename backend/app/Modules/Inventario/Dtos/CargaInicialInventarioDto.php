<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Dtos;

final readonly class CargaInicialInventarioDto
{
    public function __construct(
        public int $varianteId,
        public int $sucursalId,
        public int|float $cantidad,
        public int $usuarioId,
    ) {}
}
