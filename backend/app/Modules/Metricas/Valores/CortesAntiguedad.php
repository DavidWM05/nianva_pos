<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Valores;

use DateTimeImmutable;
use DateTimeZone;

final readonly class CortesAntiguedad
{
    public string $hace30;

    public string $hace60;

    public string $hace90;

    public function __construct(public string $hoy)
    {
        $civil = new DateTimeImmutable($hoy, new DateTimeZone('UTC'));
        $this->hace30 = $civil->modify('-30 days')->format('Y-m-d');
        $this->hace60 = $civil->modify('-60 days')->format('Y-m-d');
        $this->hace90 = $civil->modify('-90 days')->format('Y-m-d');
    }
}
