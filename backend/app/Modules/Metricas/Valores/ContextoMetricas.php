<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Valores;

use DateTimeZone;

final readonly class ContextoMetricas
{
    public function __construct(
        public int $tenantId,
        public ?int $sucursalId,
        public DateTimeZone $zona,
        public PeriodoMetricas $periodo,
        public string $fechaCorte,
    ) {}

    public function enPeriodo(string $desde, string $hasta): self
    {
        return new self(
            $this->tenantId,
            $this->sucursalId,
            $this->zona,
            PeriodoMetricas::entre($desde, $hasta, $this->zona),
            $this->fechaCorte,
        );
    }
}
