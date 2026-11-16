<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Dtos;

final readonly class ProductoVarianteDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public ?string $talla,
        public ?string $color,
        public ?string $codigoBarras,
        private array $presentes,
        public ?string $precioVenta = null,
        public ?string $costo = null,
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
        $datos = [];

        if (in_array('talla', $this->presentes, true)) {
            $datos['talla'] = $this->talla;
        }

        if (in_array('color', $this->presentes, true)) {
            $datos['color'] = $this->color;
        }

        if (in_array('codigo_barras', $this->presentes, true)) {
            $datos['codigo_barras'] = $this->codigoBarras;
        }

        if (in_array('precio_venta', $this->presentes, true)) {
            $datos['precio_venta'] = $this->precioVenta;
        }

        if (in_array('costo', $this->presentes, true)) {
            $datos['costo'] = $this->costo;
        }

        return $datos;
    }
}
