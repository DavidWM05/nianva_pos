<?php

namespace App\Modules\Tpv\Dtos;

final readonly class CotizarVentaDto
{
    /**
     * @param  list<LineaVentaDto>  $items
     */
    public function __construct(
        public array $items,
    ) {}
}
