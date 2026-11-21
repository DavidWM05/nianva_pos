<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

use App\Modules\Nucleo\Models\Usuario;

final readonly class OperacionSupervisorDto
{
    public function __construct(
        public Usuario $usuario,
        #[\SensitiveParameter] public ?string $token,
        public string $huella,
        public ?string $sesionHash,
    ) {}
}
