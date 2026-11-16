<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Dtos;

final readonly class AtributoDto
{
    /** @param  list<string>  $presentes */
    public function __construct(
        public ?string $nombre,
        public ?int $orden,
        private array $presentes,
    ) {}

    /** @return array<string, mixed> */
    public function datosPresentes(): array
    {
        $datos = [];
        if (in_array('nombre', $this->presentes, true)) {
            $datos['nombre'] = $this->nombre;
        }
        if (in_array('orden', $this->presentes, true)) {
            $datos['orden'] = $this->orden ?? 0;
        }

        return $datos;
    }
}
