<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

final readonly class ConsultarReporteTenantDto
{
    public function __construct(
        public int $pagina,
        public int $filas,
        public int $limite,
    ) {}
}
