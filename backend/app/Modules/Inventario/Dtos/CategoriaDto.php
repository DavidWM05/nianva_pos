<?php

namespace App\Modules\Inventario\Dtos;

final readonly class CategoriaDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public string $nombre,
        public ?string $descripcion,
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

        return $datos;
    }
}
