<?php

declare(strict_types=1);

namespace App\Modules\Precios\Dtos;

final readonly class ListarListasPrecioDto
{
    /** @param 'asc'|'desc' $sortOrder */
    public function __construct(public int $page, public int $rows, public string $sortField, public string $sortOrder, public string $q) {}
}
