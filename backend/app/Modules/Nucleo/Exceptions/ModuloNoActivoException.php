<?php

namespace App\Modules\Nucleo\Exceptions;

/**
 * Lanzada por ModuloActivo middleware cuando el tenant no tiene habilitado
 * el módulo en configuracion_tenant.modulos_activos.
 */
class ModuloNoActivoException extends ExcepcionNegocio
{
    public function __construct(string $moduloSlug)
    {
        parent::__construct("El módulo '{$moduloSlug}' no está activo para este tenant.");
    }

    public function errorCode(): string
    {
        return 'modulo_no_activo';
    }

    public function status(): int
    {
        return 403;
    }
}
