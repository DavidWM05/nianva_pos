<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Services\TrustedDeviceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

/**
 * Flujo estandar de Laravel (Password broker + password_reset_tokens,
 * expire=60 en config/auth.php) -- unico cambio real es que las
 * credenciales usan 'correo' en vez de 'email' (ver Usuario::
 * getEmailForPasswordReset()/routeNotificationForMail()) y que la
 * notificacion apunta al frontend (ver ResetPasswordNotification).
 * Tambien vive aqui cambiar() -- la contrasena mientras ya hay sesion
 * activa, distinto del flujo de token via correo.
 */
class PasswordResetController extends Controller
{
    public function __construct(private readonly TrustedDeviceService $trustedDeviceService) {}

    public function sendResetLink(Request $request)
    {
        $validated = $request->validate(['correo' => ['required', 'email']]);

        // Siempre responde 200 con el mismo mensaje generico exista o no el
        // correo -- evita que este endpoint sirva para enumerar cuentas.
        Password::broker()->sendResetLink(['correo' => $validated['correo']]);

        return response()->json([
            'status' => 'Si el correo existe, se envio un enlace para restablecer la contrasena.',
        ]);
    }

    public function reset(Request $request)
    {
        $validated = $request->validate([
            'correo' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::broker()->reset(
            [
                'correo' => $validated['correo'],
                'token' => $validated['token'],
                'password' => $validated['password'],
            ],
            function ($usuario, $password): void {
                $usuario->forceFill(['password' => $password])->save();
                $this->trustedDeviceService->revocarTodos($usuario);
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['correo' => [__($status)]]);
        }

        return response()->json(['status' => __($status)]);
    }

    /**
     * Cambiar la contrasena estando ya autenticado (a diferencia de
     * reset(), que es el flujo de "olvide mi contrasena" via token de
     * correo). Protegida por el middleware dos-factor.reciente en la ruta.
     */
    public function cambiar(Request $request)
    {
        $validated = $request->validate([
            'password_actual' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $usuario = $request->user();

        if (! Hash::check($validated['password_actual'], $usuario->password)) {
            throw ValidationException::withMessages(['password_actual' => ['La contrasena actual no es correcta.']]);
        }

        $usuario->forceFill(['password' => $validated['password']])->save();
        $this->trustedDeviceService->revocarTodos($usuario);

        return response()->json(['status' => 'Contrasena actualizada.']);
    }
}
