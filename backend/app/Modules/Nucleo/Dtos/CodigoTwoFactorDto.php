<?php

namespace App\Modules\Nucleo\Dtos;

use SensitiveParameter;

final readonly class CodigoTwoFactorDto
{
    public function __construct(
        #[SensitiveParameter]
        public string $code,
    ) {}
}
