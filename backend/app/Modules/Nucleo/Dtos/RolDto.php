<?php

namespace App\Modules\Nucleo\Dtos;

final readonly class RolDto
{
    /**
     * @param  list<int>  $permisos
     * @param  list<string>  $presentes
     */
    public function __construct(
        public string $nombre,
        public ?string $descripcion,
        public array $permisos,
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

    /**
     * Comportamiento existente: si `permisos` no llega, se sincroniza vacio.
     *
     * @return list<int>
     */
    public function permisosParaSync(): array
    {
        return $this->permisos;
    }
}
