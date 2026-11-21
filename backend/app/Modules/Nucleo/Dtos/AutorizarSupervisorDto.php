<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

use App\Modules\Nucleo\Support\AccionSupervisor;

final readonly class AutorizarSupervisorDto
{
    public function __construct(
        public int $supervisorId,
        #[\SensitiveParameter] public string $pin,
        public AccionSupervisor $accion,
        public ?string $recurso,
        public string $huella,
    ) {}
}
