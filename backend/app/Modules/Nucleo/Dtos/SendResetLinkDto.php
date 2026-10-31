<?php

namespace App\Modules\Nucleo\Dtos;

final readonly class SendResetLinkDto
{
    public function __construct(
        public string $correo,
    ) {}
}
