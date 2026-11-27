<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Support\Str;

trait FirmaLicenciaPos
{
    /** @var array<string, \OpenSSLAsymmetricKey> */
    private static array $firmantes = [];

    protected function prepararFirmaLicencia(): void
    {
        $rutas = [];
        foreach (['primera', 'segunda'] as $kid) {
            self::$firmantes[$kid] ??= openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
            $publica = openssl_pkey_get_details(self::$firmantes[$kid])['key'];
            $ruta = tempnam(sys_get_temp_dir(), 'pos-llave-');
            file_put_contents($ruta, $publica);
            $this->beforeApplicationDestroyed(static fn () => unlink($ruta));
            $rutas[$kid] = $ruta;
        }

        $instancia = tempnam(sys_get_temp_dir(), 'pos-instancia-');
        file_put_contents($instancia, (string) Str::uuid());
        $this->beforeApplicationDestroyed(static fn () => unlink($instancia));
        config([
            'licencias.archivo_instancia' => $instancia,
            'licencias.producto_id' => 321,
            'licencias.llaves' => $rutas,
        ]);
    }

    /** @param array<string, mixed> $cambios */
    protected function tokenPos(array $cambios = [], ?string $kid = 'primera', string $firmante = 'primera'): string
    {
        $codificar = static fn (string $s): string => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
        $cabecera = ['alg' => 'RS256', 'typ' => 'JWT'];
        if ($kid !== null) {
            $cabecera['kid'] = $kid;
        }

        $claims = array_replace([
            'producto_id' => 321,
            'identificador_instancia' => trim((string) file_get_contents(config('licencias.archivo_instancia'))),
            'tipo' => 'pago_unico',
            'fecha_expiracion' => null,
            'soporte_hasta' => '2024-01-01',
            'plan_codigo' => 'avanzado',
            'features' => ['tpv', 'administracion', 'caja', 'clientes', 'cotizaciones', 'reportes', 'reportes_csv'],
            'cuotas' => ['terminales' => 3, 'sucursales' => 1],
        ], $cambios);
        $mensaje = $codificar(json_encode($cabecera, JSON_THROW_ON_ERROR)).'.'.$codificar(json_encode($claims, JSON_THROW_ON_ERROR));
        openssl_sign($mensaje, $firma, self::$firmantes[$firmante], OPENSSL_ALGO_SHA256);

        return $mensaje.'.'.$codificar($firma);
    }
}
