<?php

namespace App\Modules\Crm\Dtos;

final readonly class ClienteDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public string $nombre,
        public ?string $documentoFiscal,
        public ?string $telefono,
        public ?string $correo,
        public ?string $direccion,
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
        if (in_array('documento_fiscal', $this->presentes, true)) {
            $datos['documento_fiscal'] = $this->documentoFiscal;
        }
        if (in_array('telefono', $this->presentes, true)) {
            $datos['telefono'] = $this->telefono;
        }
        if (in_array('correo', $this->presentes, true)) {
            $datos['correo'] = $this->correo;
        }
        if (in_array('direccion', $this->presentes, true)) {
            $datos['direccion'] = $this->direccion;
        }

        return $datos;
    }
}
