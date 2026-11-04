<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Dtos;

use App\Modules\Nucleo\Models\Usuario;

/**
 * Lo que devuelve ObtenerSesion (API-09). Tipado para que SesionResource y la
 * especificacion OpenAPI conozcan la forma de cada campo.
 */
final readonly class SesionDto
{
    /**
     * @param  array{id: int, nombre: string}|null  $sucursal
     * @param  list<string>  $permisos
     * @param  list<string>  $modulosActivos
     * @param  array{locale: string, moneda: string, zona_horaria: string}  $regional
     */
    public function __construct(
        public Usuario $usuario,
        public ?array $sucursal,
        public array $permisos,
        public array $modulosActivos,
        public array $regional,
    ) {}
}
