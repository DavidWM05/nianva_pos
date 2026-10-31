<?php

namespace App\Modules\Nucleo\Dtos;

final readonly class MetodoPagoDto
{
    public function __construct(
        public string $nombre,
        public string $tipo,
        public bool $incluirEnFinanciero,
    ) {}
}
