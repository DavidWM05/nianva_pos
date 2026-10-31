<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\CambiarPasswordRequest;
use App\Modules\Nucleo\Http\Requests\ResetPasswordRequest;
use App\Modules\Nucleo\Http\Requests\SendResetLinkRequest;
use App\Modules\Nucleo\Services\TrustedDeviceService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
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

    public function sendResetLink(SendResetLinkRequest $request)
    {
        // Siempre responde 200 con el mismo mensaje generico exista o no el
        // correo -- evita que este endpoint sirva para enumerar cuentas.
        Password::broker()->sendResetLink(['correo' => $request->toDto()->correo]);

        return response()->json([
            'status' => 'Si el correo existe, se envio un enlace para restablecer la contrasena.',
        ]);
    }

    public function reset(ResetPasswordRequest $request)
    {
        $dto = $request->toDto();

        $status = Password::broker()->reset(
            [
                'correo' => $dto->correo,
                'token' => $dto->token,
                'password' => $dto->password,
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
    public function cambiar(CambiarPasswordRequest $request)
    {
        $dto = $request->toDto();
        $usuario = $request->user();

        if (! Hash::check($dto->passwordActual, $usuario->password)) {
            throw ValidationException::withMessages(['password_actual' => ['La contrasena actual no es correcta.']]);
        }

        $usuario->forceFill(['password' => $dto->password])->save();
        $this->trustedDeviceService->revocarTodos($usuario);

        return response()->json(['status' => 'Contrasena actualizada.']);
    }
}
