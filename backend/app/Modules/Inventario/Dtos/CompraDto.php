<?php

namespace App\Modules\Inventario\Dtos;

final readonly class CompraDto
{
    /**
     * @param  list<LineaCompraDto>  $items
     */
    public function __construct(
        public int $proveedorId,
        public ?string $numeroComprobante,
        public array $items,
    ) {}
}
