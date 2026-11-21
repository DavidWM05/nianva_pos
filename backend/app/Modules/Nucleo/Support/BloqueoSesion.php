<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Cache;

final class BloqueoSesion
{
    public static function activa(Session $sesion): bool
    {
        return Cache::has(self::clave($sesion));
    }

    public static function activar(Session $sesion): void
    {
        Cache::put(self::clave($sesion), true, now()->addMinutes(max(480, config()->integer('session.lifetime'))));
    }

    public static function quitar(Session $sesion): void
    {
        Cache::forget(self::clave($sesion));
    }

    private static function clave(Session $sesion): string
    {
        return 'seg12:bloqueo:'.hash('sha256', $sesion->getId());
    }
}
