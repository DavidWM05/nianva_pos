<?php

namespace App\Modules\UnidadesMedida\Dtos;

final readonly class UnidadMedidaDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public ?string $nombre,
        public ?string $abreviatura,
        public ?string $tipo,
        public ?bool $activo,
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
        if (in_array('abreviatura', $this->presentes, true)) {
            $datos['abreviatura'] = $this->abreviatura;
        }
        if (in_array('tipo', $this->presentes, true)) {
            $datos['tipo'] = $this->tipo;
        }
        if (in_array('activo', $this->presentes, true)) {
            $datos['activo'] = $this->activo;
        }

        return $datos;
    }
}
