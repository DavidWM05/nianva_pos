<?php

declare(strict_types=1);

namespace App\Modules\Configuracion\Dtos;

final readonly class AplicarPerfilGiroDto
{
    public function __construct(public string $perfil) {}
}
