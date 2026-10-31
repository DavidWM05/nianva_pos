<?php

namespace App\Modules\Produccion\Dtos;

final readonly class CrearRecetaDto
{
    /**
     * @param  list<IngredienteRecetaDto>  $ingredientes
     */
    public function __construct(
        public int $varianteId,
        public string $nombre,
        public ?float $rendimiento,
        public ?string $instrucciones,
        public ?string $descripcion,
        public array $ingredientes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'variante_id' => $this->varianteId,
            'nombre' => $this->nombre,
            'rendimiento' => $this->rendimiento,
            'instrucciones' => $this->instrucciones,
            'descripcion' => $this->descripcion,
            'ingredientes' => array_map(
                fn (IngredienteRecetaDto $ingrediente) => [
                    'insumo_id' => $ingrediente->insumoId,
                    'cantidad' => $ingrediente->cantidad,
                    'unidad_medida_id' => $ingrediente->unidadMedidaId,
                ],
                $this->ingredientes,
            ),
        ];
    }
}
