<?php

namespace App\Modules\Apartados\Dtos;

final readonly class RegistrarAbonoApartadoDto
{
    /**
     * @param  list<PagoApartadoDto>  $pagos
     */
    public function __construct(
        public float $monto,
        public array $pagos,
        public ?string $notas,
    ) {}
}
