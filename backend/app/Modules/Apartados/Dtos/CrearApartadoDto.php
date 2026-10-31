<?php

namespace App\Modules\Apartados\Dtos;

final readonly class CrearApartadoDto
{
    /**
     * @param  list<LineaApartadoDto>  $items
     */
    public function __construct(
        public int $clienteId,
        public array $items,
        public ?string $fechaVencimiento,
        public ?string $notas,
    ) {}
}
