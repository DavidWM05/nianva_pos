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
     * @param  array{id: int, nombre: string, sucursal_id: int}|null  $terminal
     * @param  array{codigo: string, nombre: string, features: list<string>}|null  $plan
     * @param  array{terminales: array{maximo: int, uso: int}, sucursales: array{maximo: int, uso: int}}|null  $limites
     * @param  array{estado: 'sin_licencia'|'activa'|'prueba'|'vencida'|'revocada', modo_operativo: 'operativa'|'solo_lectura', motivo: 'revocada'|'instancia_distinta'|'token_invalido'|'gracia_agotada'|null, gracia_hasta: string|null, soporte_hasta: string|null}|null  $licencia
     * @param  array{clave: string, nombre: string}|null  $perfilGiro
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
        public ?array $terminal = null,
        public ?array $plan = null,
        public ?array $limites = null,
        public ?array $licencia = null,
        public ?array $perfilGiro = null,
    ) {}
}
