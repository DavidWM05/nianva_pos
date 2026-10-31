<?php

namespace App\Modules\CrmAvanzado\Dtos;

final readonly class CrearInteraccionDto
{
    public function __construct(
        public string $tipo,
        public string $observacion,
    ) {}
}
