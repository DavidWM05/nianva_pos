<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Services;

use App\Modules\Metricas\Valores\PeriodoMetricas;
use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use Psr\Clock\ClockInterface;
use Symfony\Component\Clock\NativeClock;

final readonly class CalendarioMetricas
{
    public function __construct(private ClockInterface $reloj = new NativeClock('UTC')) {}

    public function fechaLocal(DateTimeZone $zona, ?DateTimeInterface $instante = null): string
    {
        return DateTimeImmutable::createFromInterface($instante ?? $this->reloj->now())->setTimezone($zona)->format('Y-m-d');
    }

    public function mesActual(DateTimeZone $zona): PeriodoMetricas
    {
        $hoy = $this->fechaLocal($zona);

        return PeriodoMetricas::entre(substr($hoy, 0, 7).'-01', $hoy, $zona);
    }
}
