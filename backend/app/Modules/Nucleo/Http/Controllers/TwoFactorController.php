<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\ConfirmTwoFactorRequest;
use App\Modules\Nucleo\Http\Requests\VerifyLoginRequest;
use App\Modules\Nucleo\Http\Resources\UsuarioResource;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TrustedDeviceService;
use App\Modules\Nucleo\Services\TwoFactorService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Configuracion inicial de 2FA (QR + confirmacion) y verificacion del
 * segundo factor durante el login. Los dos primeros endpoints (setup,
 * confirm) se montan SIN el middleware two-factor.confirmed a proposito:
 * son la unica salida para un admin que todavia no lo tiene configurado,
 * si tambien estuvieran bloqueados nunca podria terminar de configurarlo.
 */
class TwoFactorController extends Controller
{
    public function __construct(
        private readonly TwoFactorService $twoFactorService,
        private readonly TrustedDeviceService $trustedDeviceService,
    ) {}

    /**
     * Genera (o reutiliza, si ya se pidio antes y no se ha confirmado) el
     * secreto pendiente y la URI otpauth:// -- el frontend renderiza el QR.
     */
    public function setup(Request $request)
    {
        $usuario = $request->user();

        if ($usuario->two_factor_confirmed_at !== null) {
            abort(409, 'La autenticacion en dos pasos ya esta configurada.');
        }

        $secret = $usuario->two_factor_secret ?? $this->twoFactorService->generateSecretKey();

        if ($usuario->two_factor_secret === null) {
            $usuario->forceFill(['two_factor_secret' => $secret])->save();
        }

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => $this->twoFactorService->getOtpAuthUrl(
                (string) config('app.name'),
                $usuario->correo,
                $secret,
            ),
        ]);
    }

    /**
     * Confirma el codigo generado a partir del secreto pendiente. Si es
     * valido, activa el 2FA y genera los codigos de recuperacion -- se
     * devuelven UNA sola vez aqui, nunca se pueden volver a consultar.
     */
    public function confirm(ConfirmTwoFactorRequest $request)
    {
        $usuario = $request->user();

        if ($usuario->two_factor_secret === null) {
            abort(400, 'Primero solicita el codigo QR.');
        }

        if (! $this->twoFactorService->verifyKey($usuario->two_factor_secret, $request->toDto()->code)) {
            throw ValidationException::withMessages(['code' => ['Codigo invalido.']]);
        }

        $recoveryCodes = $this->twoFactorService->generateRecoveryCodes();

        $usuario->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $recoveryCodes,
        ])->save();

        return response()->json([
            'user' => new UsuarioResource($usuario),
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Segundo paso del login cuando el usuario ya tiene 2FA confirmado.
     * Acepta un codigo TOTP o, si se agoto/perdio el dispositivo, un codigo
     * de recuperacion (de un solo uso -- se consume al usarlo).
     */
    public function verifyLogin(VerifyLoginRequest $request)
    {
        $code = $request->toDto()->code;
        $userId = $request->session()->get('auth.2fa.user_id');

        if (! $userId) {
            abort(419, 'No hay un inicio de sesion pendiente de verificar.');
        }

        $usuario = Usuario::sinTenant()->findOrFail($userId);

        if (! $this->intentarConCodigoTotp($usuario, $code)
            && ! $this->intentarConCodigoDeRecuperacion($usuario, $code)
        ) {
            throw ValidationException::withMessages(['code' => ['Codigo invalido.']]);
        }

        $request->session()->forget('auth.2fa.user_id');

        AuthController::autenticar($request, $usuario);
        $this->trustedDeviceService->generarYAlmacenar($request, $usuario);

        return response()->json(['user' => new UsuarioResource($usuario)]);
    }

    private function intentarConCodigoTotp(Usuario $usuario, string $code): bool
    {
        return $usuario->two_factor_secret !== null
            && $this->twoFactorService->verifyKey($usuario->two_factor_secret, $code);
    }

    private function intentarConCodigoDeRecuperacion(Usuario $usuario, string $code): bool
    {
        $recoveryCodes = $usuario->two_factor_recovery_codes ?? [];
        $code = strtoupper($code);

        if (! in_array($code, $recoveryCodes, true)) {
            return false;
        }

        $usuario->forceFill([
            'two_factor_recovery_codes' => array_values(array_diff($recoveryCodes, [$code])),
        ])->save();

        return true;
    }
}
