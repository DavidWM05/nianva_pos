<?php

namespace App\Modules\Nucleo\Services;

use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use App\Modules\Nucleo\Models\DispositivoConfiable;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

/**
 * "Recordar este dispositivo" tras completar el segundo factor: guarda un
 * token en una cookie separada de la cookie de sesion de Sanctum. Un login
 * subsecuente desde el mismo dispositivo puede omitir el paso de 2FA
 * (nunca el de correo+password, eso lo sigue exigiendo AuthController::login()
 * siempre). La cookie la encripta/firma automaticamente el middleware
 * EncryptCookies de Laravel (no esta en cookie.php 'except'), y el token
 * se guarda HASHEADO en dispositivos_confiables -- igual que remember_token,
 * un dump de la base de datos no alcanza para suplantar un dispositivo.
 */
class TrustedDeviceService
{
    public const NOMBRE_COOKIE = 'dispositivo_confiable';

    private const DIAS_ADMIN_DEFAULT = 30;

    private const DIAS_NORMAL_DEFAULT = 30;

    public function esDispositivoConfiable(Request $request, Usuario $usuario): bool
    {
        $token = $request->cookie(self::NOMBRE_COOKIE);

        if (! $token) {
            return false;
        }

        return DispositivoConfiable::where('usuario_id', $usuario->id)
            ->where('identificador_dispositivo', $this->hash($token))
            ->where('fecha_expiracion', '>', now())
            ->exists();
    }

    public function generarYAlmacenar(Request $request, Usuario $usuario): void
    {
        $token = Str::random(64);
        $dias = $this->diasParaUsuario($usuario);

        DispositivoConfiable::create([
            'usuario_id' => $usuario->id,
            'identificador_dispositivo' => $this->hash($token),
            'user_agent' => (string) $request->userAgent(),
            'ip_registro' => (string) $request->ip(),
            'fecha_creacion' => now(),
            'fecha_expiracion' => now()->addDays($dias),
        ]);

        Cookie::queue(Cookie::make(
            name: self::NOMBRE_COOKIE,
            value: $token,
            minutes: $dias * 24 * 60,
            path: '/',
            domain: config('session.domain'),
            secure: (bool) config('session.secure'),
            httpOnly: true,
            sameSite: config('session.same_site'),
        ));
    }

    /**
     * Cambiar la contrasena, revocar un dispositivo puntual desde el perfil,
     * o desactivar 2FA invalidan la confianza ya otorgada -- el proximo
     * login (desde cualquier dispositivo) vuelve a exigir el segundo factor.
     */
    public function revocarTodos(Usuario $usuario): void
    {
        DispositivoConfiable::where('usuario_id', $usuario->id)->delete();
    }

    /**
     * dias_dispositivo_admin para admin/superadmin, dias_dispositivo_normal
     * para el resto -- ver Usuario::requiereDosFactor(), el mismo criterio
     * que ya decide si el 2FA es obligatorio. Un cambio posterior en
     * ConfiguracionSeguridad solo afecta dispositivos confiados A PARTIR de
     * ese momento: este valor se calcula una sola vez, al confiar el
     * dispositivo, y se guarda en fecha_expiracion -- nunca se recalcula.
     */
    public function diasParaUsuario(Usuario $usuario): int
    {
        $config = $usuario->tenant_id !== null
            ? ConfiguracionSeguridad::where('tenant_id', $usuario->tenant_id)->first()
            : null;

        return $usuario->requiereDosFactor()
            ? ($config->dias_dispositivo_admin ?? self::DIAS_ADMIN_DEFAULT)
            : ($config->dias_dispositivo_normal ?? self::DIAS_NORMAL_DEFAULT);
    }

    private function hash(string $token): string
    {
        return hash('sha256', $token);
    }
}
