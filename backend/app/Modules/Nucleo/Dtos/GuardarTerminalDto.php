<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

final readonly class GuardarTerminalDto
{
    public function __construct(public string $nombre, public int $sucursalId) {}
}
