<?php

namespace App\Modules\Gastos\Dtos;

final readonly class CrearGastoDto
{
    public function __construct(
        public string $descripcion,
        public float $monto,
    ) {}
}
