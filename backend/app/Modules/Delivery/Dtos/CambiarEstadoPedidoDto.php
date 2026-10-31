<?php

namespace App\Modules\Delivery\Dtos;

final readonly class CambiarEstadoPedidoDto
{
    public function __construct(
        public string $estado,
    ) {}
}
