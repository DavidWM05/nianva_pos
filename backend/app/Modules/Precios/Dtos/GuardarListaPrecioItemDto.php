<?php

declare(strict_types=1);

namespace App\Modules\Precios\Dtos;

final readonly class GuardarListaPrecioItemDto
{
    public function __construct(public ?int $productoId, public ?int $varianteId, public string $precio) {}

    /** @return array<string, mixed> */
    public function datos(): array
    {
        return ['producto_id' => $this->productoId, 'variante_id' => $this->varianteId, 'precio' => $this->precio];
    }
}
