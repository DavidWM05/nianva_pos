<?php

namespace App\Modules\CuentasCobrar\Dtos;

final readonly class RegistrarAbonoDto
{
    public function __construct(
        public float $monto,
        public int $metodoPagoId,
        public ?string $referencia,
    ) {}
}
