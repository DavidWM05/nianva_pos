<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

use App\Modules\Nucleo\Support\AccionSupervisor;

final readonly class ListarSupervisoresDto
{
    public function __construct(
        public AccionSupervisor $accion,
        public ?string $recurso,
    ) {}
}
