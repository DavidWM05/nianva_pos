<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

final readonly class ConsultaMetricasSucursalDto
{
    public function __construct(
        public ?int $sucursalId,
        public ?string $desde,
        public ?string $hasta,
        public int $pagina,
        public int $filas,
    ) {}
}
