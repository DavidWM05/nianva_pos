<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Dtos;

final readonly class FechaConsolidadoCajaDto
{
    public function __construct(public string $fecha) {}
}
