<?php

namespace App\Modules\Cotizaciones\Dtos;

final readonly class ConvertirCotizacionDto
{
    public function __construct(
        public int $metodoPagoId,
    ) {}
}
