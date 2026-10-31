<?php

namespace App\Modules\Auditoria\Dtos;

final readonly class AuditoriaFiltrosDto
{
    public function __construct(
        public ?string $tabla,
        public ?int $usuarioId,
        public ?string $fechaDesde,
        public ?string $fechaHasta,
    ) {}
}
