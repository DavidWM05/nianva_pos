<?php

namespace App\Modules\Produccion\Dtos;

final readonly class CambiarEstadoOrdenDto
{
    public function __construct(
        public string $estado,
        public ?int $cantidadProducida,
    ) {}
}
