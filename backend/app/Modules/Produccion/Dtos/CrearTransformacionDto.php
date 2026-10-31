<?php

namespace App\Modules\Produccion\Dtos;

final readonly class CrearTransformacionDto
{
    public function __construct(
        public int $varianteOrigenId,
        public int $varianteDestinoId,
        public float $cantidadOrigen,
        public float $cantidadDestino,
        public ?string $notas,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'variante_origen_id' => $this->varianteOrigenId,
            'variante_destino_id' => $this->varianteDestinoId,
            'cantidad_origen' => $this->cantidadOrigen,
            'cantidad_destino' => $this->cantidadDestino,
            'notas' => $this->notas,
        ];
    }
}
