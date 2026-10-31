<?php

namespace App\Modules\CuentasPagar\Dtos;

final readonly class RegistrarPagoDto
{
    public function __construct(
        public float $monto,
        public int $metodoPagoId,
        public ?string $referencia,
    ) {}
}
