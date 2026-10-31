<?php

namespace App\Modules\Inventario\Dtos;

final readonly class ProveedorDto
{
    public function __construct(
        public string $razonSocial,
        public ?string $rfc,
        public ?string $telefono,
        public ?string $correo,
        public ?string $direccion,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'razon_social' => $this->razonSocial,
            'rfc' => $this->rfc,
            'telefono' => $this->telefono,
            'correo' => $this->correo,
            'direccion' => $this->direccion,
        ];
    }
}
