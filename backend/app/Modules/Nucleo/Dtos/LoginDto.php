<?php

namespace App\Modules\Nucleo\Dtos;

use SensitiveParameter;

final readonly class LoginDto
{
    public function __construct(
        public string $correo,
        #[SensitiveParameter]
        public string $password,
    ) {}
}
