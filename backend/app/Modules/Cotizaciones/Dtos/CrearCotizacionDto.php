<?php

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
    ) {}

    /**
     * @return list<array{variante_id:int, cantidad:int, precio_unitario:float, descuento:float}>
     */
    public function itemsParaServicio(): array
    {
        return array_map(
            fn (LineaCotizacionDto $item) => [
                'variante_id' => $item->varianteId,
                'cantidad' => $item->cantidad,
                'precio_unitario' => $item->precioUnitario,
                'descuento' => $item->descuento,
            ],
            $this->items,
        );
    }
}
