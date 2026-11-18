<?php

declare(strict_types=1);

namespace App\Modules\Cotizaciones\Dtos;

final readonly class CrearCotizacionDto
{
    /**
     * @param  list<LineaCotizacionDto>  $items
     */
    public function __construct(
        public ?int $clienteId,
        public int $sucursalId,
        public int $validezDias,
        public float $descuento,
        public ?string $usoCfdi,
        public ?string $observaciones,
        public array $items,
        public ?int $listaPrecioId = null,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function itemsParaServicio(): array
    {
        return array_map(fn (LineaCotizacionDto $item) => $item->paraServicio(), $this->items);
    }
}
