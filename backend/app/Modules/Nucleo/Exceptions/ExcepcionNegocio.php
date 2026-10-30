<?php

namespace App\Modules\Nucleo\Exceptions;

use RuntimeException;

/**
 * Base de las excepciones de negocio (API-03, API-04): cada una declara su
 * error_code estable, su status HTTP y el contexto extra de la respuesta.
 * errorCode() y status() devuelven literales para que el catalogo pueda
 * leerlos sin construir la excepcion.
 */
abstract class ExcepcionNegocio extends RuntimeException
{
    abstract public function errorCode(): string;

    public function status(): int
    {
        return 422;
    }

    public function contexto(): array
    {
        return [];
    }
}
