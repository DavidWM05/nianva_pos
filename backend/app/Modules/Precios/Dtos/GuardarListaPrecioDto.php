<?php

declare(strict_types=1);

namespace App\Modules\Precios\Dtos;

final readonly class GuardarListaPrecioDto
{
    public function __construct(public string $nombre, public ?bool $activo = null) {}

    /** @return array<string, mixed> */
    public function datos(): array
    {
        return ['nombre' => $this->nombre, ...($this->activo === null ? [] : ['activo' => $this->activo])];
    }
}
