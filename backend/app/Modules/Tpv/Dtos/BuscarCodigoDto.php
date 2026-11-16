<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Dtos;

final readonly class BuscarCodigoDto
{
    public function __construct(public string $codigo, public int $tenantId, public ?int $sucursalId) {}
}
