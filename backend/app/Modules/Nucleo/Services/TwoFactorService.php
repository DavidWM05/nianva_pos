<?php

namespace App\Modules\Nucleo\Services;

use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * Unico punto de acceso a la logica de TOTP (generar secreto, construir la
 * URI otpauth:// que el frontend convierte en QR, verificar codigos, y
 * generar codigos de recuperacion). No genera imagenes de QR -- el
 * frontend renderiza el QR del lado del cliente a partir de la URI
 * otpauth://, para no tener que mandar el secreto a un servicio de
 * imagenes ni agregar una dependencia de renderizado de imagenes en PHP.
 */
class TwoFactorService
{
    private Google2FA $engine;

    public function __construct()
    {
        $this->engine = new Google2FA;
    }

    public function generateSecretKey(): string
    {
        return $this->engine->generateSecretKey();
    }

    /**
     * URI estandar otpauth://totp/{issuer}:{email}?secret=...&issuer=...
     * (RFC de facto que sigue Google Authenticator, Authy, 1Password, etc).
     */
    public function getOtpAuthUrl(string $issuer, string $email, string $secret): string
    {
        $label = rawurlencode($issuer).':'.rawurlencode($email);

        return sprintf(
            'otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            $label,
            $secret,
            rawurlencode($issuer),
        );
    }

    public function verifyKey(string $secret, string $code): bool
    {
        return $this->engine->verifyKey($secret, $code) !== false;
    }

    /**
     * @return list<string>
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        return collect(range(1, $count))
            ->map(fn () => Str::upper(Str::random(10).'-'.Str::random(10)))
            ->values()
            ->all();
    }
}
