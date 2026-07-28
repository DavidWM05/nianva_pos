<?php

namespace App\Modules\Nucleo\Exceptions;

use RuntimeException;

/**
 * Lanzada por ModuloActivo middleware cuando el tenant no tiene habilitado
 * el módulo en configuracion_tenant.modulos_activos.
 */
class ModuloNoActivoException extends RuntimeException
{
    public function __construct(string $moduloSlug)
    {
        parent::__construct("El módulo '{$moduloSlug}' no está activo para este tenant.");
    }
}
