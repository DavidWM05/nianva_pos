<?php

namespace App\Modules\Precios\Dtos;

final readonly class ReglaPrecioDto
{
    public function __construct(
        public string $nombre,
        public string $tipo,
        public ?float $valor,
        public ?int $cantidadCompra,
        public ?int $cantidadPaga,
        public ?float $precioBundle,
        public string $aplicaA,
        public ?int $categoriaId,
        public ?int $productoId,
        public ?int $varianteId,
        public ?string $fechaInicio,
        public ?string $fechaFin,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'nombre' => $this->nombre,
            'tipo' => $this->tipo,
            'valor' => $this->valor,
            'cantidad_compra' => $this->cantidadCompra,
            'cantidad_paga' => $this->cantidadPaga,
            'precio_bundle' => $this->precioBundle,
            'aplica_a' => $this->aplicaA,
            'categoria_id' => $this->categoriaId,
            'producto_id' => $this->productoId,
            'variante_id' => $this->varianteId,
            'fecha_inicio' => $this->fechaInicio,
            'fecha_fin' => $this->fechaFin,
        ];
    }
}
