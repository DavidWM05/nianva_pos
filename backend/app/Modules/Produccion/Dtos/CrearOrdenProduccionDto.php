<?php

namespace App\Modules\Produccion\Dtos;

final readonly class CrearOrdenProduccionDto
{
    public function __construct(
        public int $recetaId,
        public int $cantidadProgramada,
        public ?string $fechaProgramada,
        public ?string $notas,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'receta_id' => $this->recetaId,
            'cantidad_programada' => $this->cantidadProgramada,
            'fecha_programada' => $this->fechaProgramada,
            'notas' => $this->notas,
        ];
    }
}
