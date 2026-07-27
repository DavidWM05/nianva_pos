<?php

namespace App\Modules\Nucleo\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protege una ruta exigiendo un permiso puntual (formato modulo.accion),
 * ej. Route::middleware('permiso:usuarios.crear'). Consulta siempre la
 * tabla permisos via Usuario::tienePermiso(), nunca un rol por nombre.
 */
class CheckPermiso
{
    public function handle(Request $request, Closure $next, string $permiso): Response
    {
        $usuario = $request->user();

        if (! $usuario || ! $usuario->tienePermiso($permiso)) {
            abort(403, "No tienes el permiso requerido: {$permiso}");
        }

        return $next($request);
    }
}
