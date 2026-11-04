<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Middleware;

use App\Modules\Nucleo\Exceptions\SesionInactivaException;
use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use App\Modules\Nucleo\Models\Usuario;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hace cumplir el tiempo de inactividad que configura cada tenant. Corre
 * después de StartSession y de ResolveTenant, para que la sesión ya exista
 * y la consulta de ConfiguracionSeguridad use el tenant del usuario.
 */
class ExpirarSesionInactiva
{
    public const CLAVE_ULTIMA_ACTIVIDAD = 'auth.ultima_actividad';

    public const MINUTOS_POR_DEFECTO = 30;

    public function handle(Request $request, Closure $next): Response
    {
        $guard = Auth::guard('web');

        if (! $guard->check()) {
            return $next($request);
        }

        if (! $request->hasSession()) {
            return $next($request);
        }

        $sesion = $request->session();
        $ahora = (int) now()->timestamp;
        $ultimaActividad = $sesion->get(self::CLAVE_ULTIMA_ACTIVIDAD);

        if (! is_int($ultimaActividad)) {
            $sesion->put(self::CLAVE_ULTIMA_ACTIVIDAD, $ahora);

            return $next($request);
        }

        $usuario = $guard->user();
        $tenantId = $usuario instanceof Usuario ? $usuario->getAttribute('tenant_id') : null;
        $minutos = is_int($tenantId)
            ? $this->minutosInactividad($tenantId)
            : self::MINUTOS_POR_DEFECTO;

        if ($ahora - $ultimaActividad > $minutos * 60) {
            $sesion->forget($guard->getName());
            $sesion->regenerateToken();
            $sesion->migrate(true);

            throw new SesionInactivaException;
        }

        $sesion->put(self::CLAVE_ULTIMA_ACTIVIDAD, $ahora);

        return $next($request);
    }

    private function minutosInactividad(?int $tenantId): int
    {
        if ($tenantId === null) {
            return self::MINUTOS_POR_DEFECTO;
        }

        $minutos = ConfiguracionSeguridad::sinTenant()
            ->where('tenant_id', $tenantId)
            ->value('minutos_inactividad');

        return is_numeric($minutos) ? (int) $minutos : self::MINUTOS_POR_DEFECTO;
    }
}
