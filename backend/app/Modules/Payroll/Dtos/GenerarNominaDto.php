<?php

namespace App\Modules\Payroll\Dtos;

final readonly class GenerarNominaDto
{
    public function __construct(
        public int $sucursalId,
        public string $periodoInicio,
        public string $periodoFin,
    ) {}
}
