<?php

declare(strict_types=1);

namespace App\Modules\NotasCredito\Dtos;

final readonly class AplicarNotaCreditoDto
{
    public function __construct(public int $notaCreditoId, public int $ventaId, public float $monto) {}
}
