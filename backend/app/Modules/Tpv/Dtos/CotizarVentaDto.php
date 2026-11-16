<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Dtos;

final readonly class CotizarVentaDto
{
    /**
     * @param  list<LineaVentaDto>  $items
     */
    public function __construct(
        public array $items,
        public ?int $clienteId = null,
        public ?int $listaPrecioId = null,
    ) {}
}
