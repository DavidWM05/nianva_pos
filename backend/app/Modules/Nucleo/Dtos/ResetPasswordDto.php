<?php

namespace App\Modules\Nucleo\Dtos;

use SensitiveParameter;

final readonly class ResetPasswordDto
{
    public function __construct(
        public string $correo,
        #[SensitiveParameter]
        public string $token,
        #[SensitiveParameter]
        public string $password,
    ) {}
}
