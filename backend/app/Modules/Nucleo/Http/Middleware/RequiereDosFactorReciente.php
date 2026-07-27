<?php

namespace App\Modules\Nucleo\Http\Middleware;

use App\Modules\Nucleo\Services\TwoFactorService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protege acciones sensibles (desactivar 2FA propio, cambiar contrasena)
 * exigiendo el TOTP de nuevo, sin importar si la request viene de un
 * dispositivo confiable -- el "recordar dispositivo" solo omite el 2FA en
 * el login, nunca en estas acciones. Si el usuario no tiene 2FA
 * configurado no hay nada que reverificar, asi que no aplica.
 */
class RequiereDosFactorReciente
{
    public function __construct(private readonly TwoFactorService $twoFactorService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if ($usuario && $usuario->two_factor_confirmed_at !== null) {
            $validated = $request->validate(['code' => ['required', 'string']]);

            if (! $this->twoFactorService->verifyKey($usuario->two_factor_secret, $validated['code'])) {
                throw ValidationException::withMessages(['code' => ['Codigo invalido.']]);
            }
        }

        return $next($request);
    }
}
