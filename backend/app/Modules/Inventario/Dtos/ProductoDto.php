<?php

namespace App\Modules\Inventario\Dtos;

final readonly class ProductoDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public string $nombre,
        public ?string $descripcion,
        public ?int $categoriaId,
        public ?int $departamentoId,
        public ?float $precioCompra,
        public ?float $precioVenta,
        public ?string $imagenUrl,
        public ?bool $noResurtible,
        public ?bool $sinDescuento,
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
        $datos = [];

        if (in_array('nombre', $this->presentes, true)) {
            $datos['nombre'] = $this->nombre;
        }
        if (in_array('descripcion', $this->presentes, true)) {
            $datos['descripcion'] = $this->descripcion;
        }
        if (in_array('categoria_id', $this->presentes, true)) {
            $datos['categoria_id'] = $this->categoriaId;
        }
        if (in_array('departamento_id', $this->presentes, true)) {
            $datos['departamento_id'] = $this->departamentoId;
        }
        if (in_array('precio_compra', $this->presentes, true)) {
            $datos['precio_compra'] = $this->precioCompra;
        }
        if (in_array('precio_venta', $this->presentes, true)) {
            $datos['precio_venta'] = $this->precioVenta;
        }
        if (in_array('imagen_url', $this->presentes, true)) {
            $datos['imagen_url'] = $this->imagenUrl;
        }
        if (in_array('no_resurtible', $this->presentes, true)) {
            $datos['no_resurtible'] = $this->noResurtible;
        }
        if (in_array('sin_descuento', $this->presentes, true)) {
            $datos['sin_descuento'] = $this->sinDescuento;
        }

        return $datos;
    }
}
