<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Valores;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use InvalidArgumentException;

final readonly class PeriodoMetricas
{
    private function __construct(
        public string $desde,
        public string $hasta,
        public DateTimeImmutable $inicioUtc,
        public DateTimeImmutable $finUtcExclusivo,
    ) {}

    public static function entre(string $desde, string $hasta, DateTimeZone $zona): self
    {
        $inicio = self::inicioDia($desde, $zona);
        $ultimoDia = self::inicioDia($hasta, $zona);
        if ($desde > $hasta) {
            throw new InvalidArgumentException('El periodo de métricas está invertido.');
        }

        $utc = new DateTimeZone('UTC');

        return new self(
            $desde,
            $hasta,
            $inicio->setTimezone($utc),
            $ultimoDia->modify('tomorrow')->setTimezone($utc),
        );
    }

    public function contiene(DateTimeInterface $instante): bool
    {
        return $instante >= $this->inicioUtc && $instante < $this->finUtcExclusivo;
    }

    private static function inicioDia(string $fecha, DateTimeZone $zona): DateTimeImmutable
    {
        $inicio = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha, $zona);
        if ($inicio === false || $inicio->format('Y-m-d') !== $fecha) {
            throw new InvalidArgumentException('Las fechas del periodo deben ser días civiles válidos en formato AAAA-MM-DD.');
        }

        return $inicio;
    }
}
