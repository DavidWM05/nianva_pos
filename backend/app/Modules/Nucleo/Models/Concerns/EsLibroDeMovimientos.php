<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Models\Concerns;

use App\Modules\Nucleo\Exceptions\LibroInmutableException;

/**
 * DAT-04: un libro de movimientos es de solo inserción. Las correcciones son movimientos nuevos;
 * actualizar o borrar un renglón desde el modelo lanza una excepción.
 */
trait EsLibroDeMovimientos
{
    public static function bootEsLibroDeMovimientos(): void
    {
        static::updating(static function (self $renglon): never {
            throw new LibroInmutableException($renglon->getTable(), 'actualizar');
        });

        static::deleting(static function (self $renglon): never {
            throw new LibroInmutableException($renglon->getTable(), 'borrar');
        });
    }
}
