<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

use DateTimeImmutable;
use Psr\Clock\ClockInterface;

final class RelojLicencia implements ClockInterface
{
    public function now(): DateTimeImmutable
    {
        return now()->toImmutable();
    }
}
