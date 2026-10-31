<?php

namespace App\Modules\Produccion\Dtos;

final readonly class IngredienteRecetaDto
{
    public function __construct(
        public int $insumoId,
        public float $cantidad,
        public int $unidadMedidaId,
    ) {}
}
