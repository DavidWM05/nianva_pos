<?php

declare(strict_types=1);

namespace App\Modules\Precios\Dtos;

final readonly class ReglaPrecioDto
{
    public function __construct(
        public string $nombre,
        public string $tipo,
        public ?string $porcentaje,
        public ?string $monto,
        public int|float|null $cantidadCompra,
        public int|float|null $cantidadPaga,
        public ?float $precioBundle,
        public string $aplicaA,
        public ?int $categoriaId,
        public ?int $productoId,
        public ?int $varianteId,
        public ?string $fechaInicio,
        public ?string $fechaFin,
        public ?int $prioridad = null,
        public ?bool $combinable = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'nombre' => $this->nombre,
            'tipo' => $this->tipo,
            'porcentaje' => $this->porcentaje,
            'monto' => $this->monto,
            'cantidad_compra' => $this->cantidadCompra,
            'cantidad_paga' => $this->cantidadPaga,
            'precio_bundle' => $this->precioBundle,
            'aplica_a' => $this->aplicaA,
            'categoria_id' => $this->categoriaId,
            'producto_id' => $this->productoId,
            'variante_id' => $this->varianteId,
            'fecha_inicio' => $this->fechaInicio,
            'fecha_fin' => $this->fechaFin,
            ...($this->prioridad === null ? [] : ['prioridad' => $this->prioridad]),
            ...($this->combinable === null ? [] : ['combinable' => $this->combinable]),
        ];
    }
}
