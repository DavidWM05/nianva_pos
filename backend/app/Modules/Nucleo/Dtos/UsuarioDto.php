<?php

namespace App\Modules\Nucleo\Dtos;

use SensitiveParameter;

final readonly class UsuarioDto
{
    /**
     * @param  list<int>  $roles
     * @param  list<string>  $presentes
     */
    public function __construct(
        public string $nombre,
        public ?string $apellido,
        public ?string $alias,
        public string $correo,
        #[SensitiveParameter]
        public ?string $password,
        public ?string $telefono,
        public ?int $sucursalId,
        public array $roles,
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
        if (in_array('apellido', $this->presentes, true)) {
            $datos['apellido'] = $this->apellido;
        }
        if (in_array('alias', $this->presentes, true)) {
            $datos['alias'] = $this->alias;
        }
        if (in_array('correo', $this->presentes, true)) {
            $datos['correo'] = $this->correo;
        }
        if (in_array('password', $this->presentes, true)) {
            $datos['password'] = $this->password;
        }
        if (in_array('telefono', $this->presentes, true)) {
            $datos['telefono'] = $this->telefono;
        }
        if (in_array('sucursal_id', $this->presentes, true)) {
            $datos['sucursal_id'] = $this->sucursalId;
        }

        return $datos;
    }

    /**
     * Comportamiento existente: si `roles` no llega, se sincroniza vacio.
     *
     * @return list<int>
     */
    public function rolesParaSync(): array
    {
        return $this->roles;
    }
}
