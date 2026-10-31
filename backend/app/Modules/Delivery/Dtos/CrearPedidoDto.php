<?php

namespace App\Modules\Delivery\Dtos;

final readonly class CrearPedidoDto
{
    /**
     * @param  list<LineaPedidoDto>  $items
     */
    public function __construct(
        public int $clienteId,
        public int $sucursalId,
        public ?string $direccionEntrega,
        public ?string $referencia,
        public ?float $costoDelivery,
        public ?int $tiempoEstimado,
        public ?string $notas,
        public array $items,
    ) {}

    /**
     * @return list<array{variante_id:int, cantidad:int, precio_unitario:float}>
     */
    public function itemsParaServicio(): array
    {
        return array_map(
            fn (LineaPedidoDto $item) => [
                'variante_id' => $item->varianteId,
                'cantidad' => $item->cantidad,
                'precio_unitario' => $item->precioUnitario,
            ],
            $this->items,
        );
    }
}
