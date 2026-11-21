<?php

declare(strict_types=1);

namespace App\Aplicacion\Sesion;

use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Nucleo\Dtos\PinSesionDto;
use App\Modules\Nucleo\Exceptions\PinCajaIncorrectoException;
use App\Modules\Nucleo\Exceptions\PinCajaIntentosAgotadosException;
use App\Modules\Nucleo\Exceptions\PinCajaNoConfiguradoException;
use App\Modules\Nucleo\Http\Middleware\ExpirarSesionInactiva;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\BloqueoSesion;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

final class PinSesion
{
    private const MAXIMO_INTENTOS = 5;

    private const VIGENCIA_INTENTOS = 600;

    public function guardar(Usuario $usuario, PinSesionDto $dto): void
    {
        if ($dto->passwordActual === null || ! Hash::check($dto->passwordActual, $usuario->getAuthPassword())) {
            throw ValidationException::withMessages(['password_actual' => 'La contraseña actual no coincide.']);
        }

        $pin = $dto->pin;
        if (count(array_unique(str_split($pin))) === 1 || str_contains('0123456789012345', $pin) || str_contains('9876543210987654', $pin)) {
            throw ValidationException::withMessages(['pin' => 'El PIN no puede ser una secuencia o repetición.']);
        }

        $usuario->forceFill(['pin_caja_hash' => Hash::make($pin)])->save();
    }

    public function bloquear(Usuario $usuario, Session $sesion): void
    {
        if ($usuario->getAttribute('pin_caja_hash') === null) {
            throw new PinCajaNoConfiguradoException;
        }

        BloqueoSesion::activar($sesion);
    }

    public function desbloquear(Usuario $usuario, Session $sesion, PinSesionDto $dto, ?string $ip, ?string $userAgent): void
    {
        if (! BloqueoSesion::activa($sesion)) {
            return;
        }

        $llave = 'seg12:intentos:'.$usuario->id;
        Cache::lock($llave.':mutex', 10)->block(3, function () use ($usuario, $dto, $sesion, $llave, $ip, $userAgent): void {
            if (RateLimiter::tooManyAttempts($llave, self::MAXIMO_INTENTOS)) {
                $this->cerrar($sesion);
            }

            $hash = $usuario->getAttribute('pin_caja_hash');
            if (! is_string($hash) || ! Hash::check($dto->pin, $hash)) {
                $intentos = RateLimiter::hit($llave, self::VIGENCIA_INTENTOS);
                Auditoria::query()->create([
                    'tenant_id' => $usuario->getAttribute('tenant_id'),
                    'tabla_afectada' => 'usuarios',
                    'registro_id' => $usuario->id,
                    'accion' => 'update',
                    'usuario_id' => $usuario->id,
                    'cambios' => ['pin_caja' => ['resultado' => 'intento_fallido']],
                    'ip' => $ip,
                    'user_agent' => substr((string) $userAgent, 0, 255),
                ]);
                if ($intentos >= self::MAXIMO_INTENTOS) {
                    $this->cerrar($sesion);
                }

                throw new PinCajaIncorrectoException;
            }

            RateLimiter::clear($llave);
            BloqueoSesion::quitar($sesion);
            $sesion->put(ExpirarSesionInactiva::CLAVE_ULTIMA_ACTIVIDAD, now()->timestamp);
        });
    }

    private function cerrar(Session $sesion): never
    {
        BloqueoSesion::quitar($sesion);
        Auth::guard('web')->logout();
        $sesion->invalidate();
        $sesion->regenerateToken();

        throw new PinCajaIntentosAgotadosException;
    }
}
