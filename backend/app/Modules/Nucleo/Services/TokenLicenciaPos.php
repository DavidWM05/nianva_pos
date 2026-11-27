<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

use DateTimeImmutable;
use DateTimeZone;
use JsonException;

/** @phpstan-type TokenVerificado array{tipo: string, fecha_expiracion: ?string, soporte_hasta: ?string, concesion: array{plan_codigo: string, features: list<string>, cuotas: array{terminales: int, sucursales: int}}|null}|null */
final class TokenLicenciaPos
{
    /** @var array<string, TokenVerificado> */
    private array $verificados = [];

    /**
     * @return TokenVerificado
     */
    public function verificar(string $token, string $instancia): ?array
    {
        $clave = $instancia.':'.$token;
        if (! array_key_exists($clave, $this->verificados)) {
            $this->verificados[$clave] = $this->verificarFirmaYClaims($token, $instancia);
        }

        return $this->verificados[$clave];
    }

    /** @return TokenVerificado */
    private function verificarFirmaYClaims(string $token, string $instancia): ?array
    {
        $partes = explode('.', $token);
        if (count($partes) !== 3) {
            return null;
        }

        [$cabecera, $cuerpo, $firma] = $partes;
        try {
            $header = json_decode($this->decodificar($cabecera), true, 16, JSON_THROW_ON_ERROR);
            $claims = json_decode($this->decodificar($cuerpo), true, 16, JSON_THROW_ON_ERROR);
            $firma = $this->decodificar($firma);
        } catch (JsonException) {
            return null;
        }

        if (! is_array($header) || ! is_array($claims) || ($header['alg'] ?? null) !== 'RS256'
            || array_key_exists('crit', $header) || array_key_exists('b64', $header)) {
            return null;
        }

        $llaves = config('licencias.llaves');
        if (array_key_exists('kid', $header)) {
            $kid = $header['kid'];
            if (! is_string($kid) || ! isset($llaves[$kid])) {
                return null;
            }
            $llaves = [$llaves[$kid]];
        }

        $valida = false;
        foreach ($llaves as $ruta) {
            if (! is_readable($ruta)) {
                continue;
            }
            $llave = openssl_pkey_get_public((string) file_get_contents($ruta));
            if ($llave !== false && (openssl_pkey_get_details($llave)['type'] ?? null) === OPENSSL_KEYTYPE_RSA
                && openssl_verify($cabecera.'.'.$cuerpo, $firma, $llave, OPENSSL_ALGO_SHA256) === 1) {
                $valida = true;
                break;
            }
        }

        $producto = config('licencias.producto_id');
        $tipo = $claims['tipo'] ?? null;
        if (! $valida || ! is_int($producto) || $producto <= 0 || ($claims['producto_id'] ?? null) !== $producto
            || ($claims['identificador_instancia'] ?? null) !== $instancia
            || ! in_array($tipo, ['pago_unico', 'anual', 'demo'], true)) {
            return null;
        }

        $vence = $claims['fecha_expiracion'] ?? null;
        if ($tipo !== 'pago_unico' && ! $this->fechaValida($vence)) {
            return null;
        }

        $soporte = $claims['soporte_hasta'] ?? null;
        $concesion = $this->concesion($claims);
        if ($concesion === null && (isset($claims['plan_codigo']) || isset($claims['features']) || isset($claims['cuotas']))) {
            return null;
        }

        return [
            'tipo' => $tipo,
            'fecha_expiracion' => $tipo === 'pago_unico' ? null : $vence,
            'soporte_hasta' => $this->fechaValida($soporte) ? $soporte : null,
            'concesion' => $concesion,
        ];
    }

    private function decodificar(string $segmento): string
    {
        if (! preg_match('/\A[A-Za-z0-9_-]+\z/', $segmento)) {
            throw new JsonException('Segmento JWT inválido.');
        }

        $valor = base64_decode(strtr($segmento, '-_', '+/'), true);
        if ($valor === false || rtrim(strtr(base64_encode($valor), '+/', '-_'), '=') !== $segmento) {
            throw new JsonException('Segmento JWT no canónico.');
        }

        return $valor;
    }

    private function fechaValida(mixed $fecha): bool
    {
        if (! is_string($fecha) || ! preg_match('/\A\d{4}-\d{2}-\d{2}\z/', $fecha)) {
            return false;
        }
        $valor = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha, new DateTimeZone('UTC'));

        return $valor !== false && $valor->format('Y-m-d') === $fecha;
    }

    /**
     * @param  array<string, mixed>  $claims
     * @return array{plan_codigo: string, features: list<string>, cuotas: array{terminales: int, sucursales: int}}|null
     */
    private function concesion(array $claims): ?array
    {
        $codigo = $claims['plan_codigo'] ?? null;
        $features = $claims['features'] ?? null;
        $cuotas = $claims['cuotas'] ?? null;
        if (! is_string($codigo) || $codigo === '' || ! is_array($features) || ! array_is_list($features)
            || array_filter($features, 'is_string') !== $features || ! is_array($cuotas)
            || ! is_int($cuotas['terminales'] ?? null) || $cuotas['terminales'] < 1
            || ! is_int($cuotas['sucursales'] ?? null) || $cuotas['sucursales'] < 1) {
            return null;
        }

        return [
            'plan_codigo' => $codigo,
            'features' => $features,
            'cuotas' => ['terminales' => $cuotas['terminales'], 'sucursales' => $cuotas['sucursales']],
        ];
    }
}
