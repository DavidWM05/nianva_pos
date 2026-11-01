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
     * null si `permisos` no llego: la edicion conserva los actuales. Una lista
     * vacia (o null explicito) si llega y los quita todos.
     *
     * @return list<int>|null
     */
    public function permisosParaSync(): ?array
    {
        return in_array('permisos', $this->presentes, true) ? $this->permisos : null;
    }
}
