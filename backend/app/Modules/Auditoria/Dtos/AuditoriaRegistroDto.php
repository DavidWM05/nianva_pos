<?php

namespace App\Modules\Auditoria\Dtos;

final readonly class AuditoriaRegistroDto
{
    public function __construct(
        public string $tabla,
        public int $registroId,
    ) {}
}
