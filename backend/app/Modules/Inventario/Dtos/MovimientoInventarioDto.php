<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Dtos;

final readonly class MovimientoInventarioDto
{
    /** @param 'entrada'|'salida' $tipo @param 'venta'|'compra'|'devolucion'|'merma'|'ajuste'|'apartado' $motivo */
    public function __construct(
        public int $varianteId,
        public int $sucursalId,
        public string $tipo,
        public int $cantidad,
        public string $motivo,
        public int $usuarioId,
        public ?string $referenciaTabla = null,
        public ?int $referenciaId = null,
    ) {}
}
