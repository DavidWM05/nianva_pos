<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

final readonly class ElegirTerminalDto
{
    public function __construct(public int $terminalId) {}
}
