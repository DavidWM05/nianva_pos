<?php

namespace App\Modules\Nucleo\Dtos;

final readonly class ConfiguracionSeguridadDto
{
    public function __construct(
        public int $diasDispositivoNormal,
        public int $diasDispositivoAdmin,
    ) {}
}
