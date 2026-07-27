<?php

namespace App\Modules\Nucleo\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea rutas protegidas mientras un usuario que requiere 2FA
 * (Usuario::requiereDosFactor(): admin o superadmin) no lo haya
 * confirmado todavia. 423 (Locked) en vez de 401/403 -- codigo distintivo
 * para que el frontend sepa mostrar la pantalla de configuracion de 2FA
 * en vez de un error generico o un redirect a login (la sesion SI es
 * valida, solo esta incompleta).
 *
 * A proposito NO se aplica a las rutas de TwoFactorController::setup()/
 * confirm() -- ver routes/api.php.
 */
class EnsureTwoFactorIsConfigured
{
    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if ($usuario && $usuario->requiereDosFactor() && $usuario->two_factor_confirmed_at === null) {
            abort(423, 'Debes configurar la autenticacion en dos pasos antes de continuar.');
        }

        return $next($request);
    }
}
