<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

final readonly class PinSesionDto
{
    public function __construct(
        #[\SensitiveParameter] public string $pin,
        #[\SensitiveParameter] public ?string $passwordActual = null,
    ) {}
}
