<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Dtos;

final readonly class ProductoVarianteDto
{
    /**
     * @param  list<string>  $presentes
     * @param  list<int>|null  $valores
     */
    public function __construct(
        public ?string $codigoBarras,
        private array $presentes,
        public ?string $precioVenta = null,
        public ?string $costo = null,
        /** ARQ-07: ids de atributo_valores; null = no llego (se conservan los de la variante). */
        public ?array $valores = null,
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
