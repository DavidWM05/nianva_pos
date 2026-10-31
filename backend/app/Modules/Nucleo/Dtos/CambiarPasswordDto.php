<?php

namespace App\Modules\Nucleo\Dtos;

use SensitiveParameter;

final readonly class CambiarPasswordDto
{
    public function __construct(
        #[SensitiveParameter]
        public string $passwordActual,
        #[SensitiveParameter]
        public string $password,
    ) {}
}
