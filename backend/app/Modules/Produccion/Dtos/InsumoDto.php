<?php

namespace App\Modules\Produccion\Dtos;

final readonly class InsumoDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public string $nombre,
        public ?string $sku,
        public int $unidadMedidaId,
        public ?float $costo,
        public ?float $stockMinimo,
        private array $presentes,
    ) {}

    /**
     * @return list<string>
     */
    public function camposPresentes(): array
    {
        return $this->presentes;
    }

    /**
     * @return array<string, mixed>
     */
    public function datosPresentes(): array
    {
        $datos = [
            'nombre' => $this->nombre,
            'unidad_medida_id' => $this->unidadMedidaId,
        ];

        if (in_array('sku', $this->presentes, true)) {
            $datos['sku'] = $this->sku;
        }
        if (in_array('costo', $this->presentes, true)) {
            $datos['costo'] = $this->costo;
        }
        if (in_array('stock_minimo', $this->presentes, true)) {
            $datos['stock_minimo'] = $this->stockMinimo;
        }

        return $datos;
    }
}
