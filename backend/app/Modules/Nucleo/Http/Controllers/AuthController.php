<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\LoginRequest;
use App\Modules\Nucleo\Http\Resources\UsuarioResource;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TrustedDeviceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Unico punto de entrada para iniciar/cerrar sesion. El login es solo
 * correo + contrasena -- el tenant se resuelve DESPUES de encontrar al
 * usuario (Usuario::sinTenant(), el unico lugar legitimo para ese bypass:
 * antes de esto no hay ningun tenant activo con el que filtrar), nunca se
 * le pide al usuario que lo especifique de antemano.
 */
class AuthController extends Controller
{
    public function __construct(private readonly TrustedDeviceService $trustedDeviceService) {}

    public function login(LoginRequest $request)
    {
        $dto = $request->toDto();

        $usuario = Usuario::sinTenant()->where('correo', $dto->correo)->first();

        // Mensaje generico e identico para "no existe" y "password incorrecta"
        // -- evita que un atacante use este endpoint para enumerar correos.
        if (! $usuario || ! Hash::check($dto->password, $usuario->password)) {
            throw ValidationException::withMessages([
                'correo' => ['Las credenciales no son validas.'],
            ]);
        }

        if (! $usuario->activo) {
            throw ValidationException::withMessages([
                'correo' => ['Este usuario esta deshabilitado.'],
            ]);
        }

        // Rechazo explicito en login (no solo confiar en que ResolveTenant lo
        // atrape en la siguiente request): un tenant inactivo debe dar un
        // mensaje claro en el propio intento de login, no un 403 generico
        // despues de haber "iniciado sesion" con exito aparente.
        if ($usuario->tenant_id !== null) {
            $tenant = Tenant::find($usuario->tenant_id);

            if (! $tenant || ! $tenant->activo) {
                throw ValidationException::withMessages([
                    'correo' => ['El negocio asociado a este usuario no esta disponible.'],
                ]);
            }
        }

        if ($usuario->two_factor_confirmed_at !== null) {
            // Dispositivo ya confiado (ver TrustedDeviceService): omite el
            // segundo factor, pero solo despues de validar correo+password
            // arriba -- nunca al reves.
            if ($this->trustedDeviceService->esDispositivoConfiable($request, $usuario)) {
                $this->autenticar($request, $usuario);

                return response()->json([
                    'user' => new UsuarioResource($usuario),
                    'two_factor_required' => false,
                ]);
            }

            // 2FA ya configurado: la sesion NO se establece todavia. Queda
            // pendiente de TwoFactorController::verifyLogin().
            $request->session()->put('auth.2fa.user_id', $usuario->id);

            return response()->json(['two_factor_required' => true]);
        }

        $this->autenticar($request, $usuario);

        return response()->json([
            'user' => new UsuarioResource($usuario),
            'two_factor_required' => false,
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    /**
     * Establece la sesion real -- el unico lugar donde se llama Auth::login()
     * en todo el flujo (aqui y en TwoFactorController::verifyLogin()).
     */
    public static function autenticar(Request $request, Usuario $usuario): void
    {
        Auth::login($usuario);
        $request->session()->regenerate();
        $usuario->forceFill(['ultimo_login' => now()])->save();
    }
}
