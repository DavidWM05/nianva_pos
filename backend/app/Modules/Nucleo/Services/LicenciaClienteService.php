<?php

namespace App\Modules\Nucleo\Services;

use App\Modules\Nucleo\Exceptions\LicenciaActivacionFallidaException;
use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Psr\Clock\ClockInterface;

/**
 * Envía POST /api/validar-licencia con producto_slug, codigo_activacion,
 * identificador_instancia y token_actual (nulo si no hay un JWT local válido).
 * El emisor responde activa con un JWT, o vencida, revocada e instancia_distinta
 * sin token. Un 404 indica que el código no corresponde a una licencia del producto.
 *
 * activar() exige una respuesta activa y un JWT válido. Cualquier fallo devuelve
 * un error y conserva la licencia local anterior.
 * revalidar() conserva la última confirmación si no hay contacto o la respuesta
 * no confirma vigencia. En anual y demo, la gracia se mide desde esa confirmación
 * o el vencimiento, lo que ocurra primero. Un vencimiento explícito se registra
 * y respeta ese plazo. Revocada e instancia_distinta bloquean de inmediato.
 * Un JWT inválido en una respuesta activa se rechaza por integridad.
 * Una perpetua nunca vence por falta de contacto.
 */
class LicenciaClienteService
{
    public function __construct(
        private readonly IdentidadLicencia $identidad,
        private readonly TokenLicenciaPos $tokens,
        private readonly EstadoLicenciaPos $estado,
        private readonly ClockInterface $reloj,
    ) {}

    public function activar(Tenant $tenant, string $codigo): LicenciaLocal
    {
        $codigo = trim($codigo);
        if ($codigo === '' || strlen($codigo) > 40) {
            throw new LicenciaActivacionFallidaException('Ingresa un código de activación válido.');
        }

        return $this->conBloqueo($tenant->id, function () use ($tenant, $codigo): LicenciaLocal {
            $licencia = $this->estado->licencia($tenant->id) ?? new LicenciaLocal(['tenant_id' => $tenant->id]);
            $instancia = $this->identidad->identificador();
            $momento = $this->reloj->now();
            $token = $licencia->getAttribute('codigo_activacion') === $codigo && $this->estado->verificar($licencia) !== null
                ? $licencia->getAttribute('token_firmado') : null;
            $respuesta = $this->contactar($codigo, $instancia, $token);
            if ($respuesta === null) {
                throw new LicenciaActivacionFallidaException('No se pudo contactar al servidor de licencias.');
            }

            if ($respuesta->status() === 404) {
                throw new LicenciaActivacionFallidaException('El servidor no tiene ninguna licencia registrada para ese producto y código de activación.');
            }

            $firmado = $this->tokenDeRespuesta($respuesta, $instancia);
            if ($firmado === null) {
                throw new LicenciaActivacionFallidaException(match ($respuesta->json('estado')) {
                    'instancia_distinta' => 'La licencia está vinculada a otra instalación.',
                    'revocada' => 'El emisor revocó la licencia.',
                    'vencida' => 'El emisor confirmó que la licencia venció.',
                    default => 'El emisor no devolvió un token POS válido para esta instalación.',
                });
            }

            $licencia->setAttribute('codigo_activacion', $codigo);
            $licencia->setAttribute('ultimo_contacto', $momento);
            $this->confirmar($licencia, $firmado, $momento);

            return $licencia;
        });
    }

    public function revalidar(LicenciaLocal $licencia): LicenciaLocal
    {
        return $this->conBloqueo((int) $licencia->getAttribute('tenant_id'), function () use ($licencia): LicenciaLocal {
            $actual = $this->estado->licencia((int) $licencia->getAttribute('tenant_id')) ?? $licencia;
            $codigo = $actual->getAttribute('codigo_activacion');
            if ($codigo === null) {
                return $actual;
            }

            $instancia = $this->identidad->identificador();
            $momento = $this->reloj->now();
            $actual->setAttribute('ultimo_contacto', $momento);
            $anterior = $this->estado->verificar($actual);
            $respuesta = $this->contactar($codigo, $instancia, $anterior === null ? null : $actual->getAttribute('token_firmado'));

            if ($respuesta?->ok() && $respuesta->json('producto_slug', 'nianva-pos') === 'nianva-pos') {
                switch ($respuesta->json('estado')) {
                    case 'revocada':
                        $actual->setAttribute('estado', 'revocada');
                        $actual->setAttribute('ultima_validacion', $momento);
                        break;
                    case 'instancia_distinta':
                        $actual->setAttribute('rechazo_remoto', 'instancia_distinta');
                        break;
                    case 'vencida':
                        if ($anterior !== null && $anterior['tipo'] !== 'pago_unico') {
                            $actual->setAttribute('estado', 'vencida');
                        }
                        break;
                    case 'activa':
                        $token = $this->tokenDeRespuesta($respuesta, $instancia);
                        if ($token === null) {
                            $actual->setAttribute('rechazo_remoto', 'token_invalido');
                            break;
                        }
                        $this->confirmar($actual, $token, $momento);

                        return $actual;
                }
            }

            if ($anterior !== null && $anterior['tipo'] !== 'pago_unico'
                && $actual->getAttribute('estado') !== 'revocada'
                && $this->estado->agotada($actual, $anterior['fecha_expiracion'])) {
                $actual->setAttribute('estado', 'vencida');
            }
            $actual->save();

            return $actual;
        });
    }

    /** @param \Closure(): LicenciaLocal $operacion */
    private function conBloqueo(int $tenantId, \Closure $operacion): LicenciaLocal
    {
        $timeout = (int) config('licencias.timeout_segundos', 10);

        return Cache::lock('licencia-pos:'.$tenantId, max(30, $timeout + 15))->block(5, $operacion);
    }

    private function contactar(string $codigo, string $instancia, ?string $token): ?Response
    {
        $url = config('licencias.servidor_url');
        if (! is_string($url) || $url === '') {
            return null;
        }

        try {
            return Http::acceptJson()->withoutRedirecting()
                ->timeout((int) config('licencias.timeout_segundos', 10))
                ->post(rtrim($url, '/').'/api/validar-licencia', [
                    'producto_slug' => 'nianva-pos',
                    'codigo_activacion' => $codigo,
                    'identificador_instancia' => $instancia,
                    'token_actual' => $token,
                ]);
        } catch (ConnectionException) {
            return null;
        }
    }

    /** @return array{token: string, tipo: string, fecha_expiracion: ?string, soporte_hasta: ?string}|null */
    private function tokenDeRespuesta(Response $respuesta, string $instancia): ?array
    {
        $token = $respuesta->json('token');
        if (! $respuesta->ok() || $respuesta->json('estado') !== 'activa'
            || $respuesta->json('producto_slug', 'nianva-pos') !== 'nianva-pos' || ! is_string($token)) {
            return null;
        }

        $datos = $this->tokens->verificar($token, $instancia);
        if ($datos === null || $respuesta->json('tipo', $datos['tipo']) !== $datos['tipo']) {
            return null;
        }

        return ['token' => $token, 'tipo' => $datos['tipo'], 'fecha_expiracion' => $datos['fecha_expiracion'], 'soporte_hasta' => $datos['soporte_hasta']];
    }

    /** @param array{token: string, tipo: string, fecha_expiracion: ?string, soporte_hasta: ?string} $datos */
    private function confirmar(LicenciaLocal $licencia, array $datos, \DateTimeImmutable $momento): void
    {
        $licencia->forceFill([
            'estado' => 'activa',
            'rechazo_remoto' => null,
            'tipo' => $datos['tipo'],
            'token_firmado' => $datos['token'],
            'fecha_expiracion' => $datos['fecha_expiracion'],
            'soporte_hasta' => $datos['soporte_hasta'],
            'ultima_validacion' => $momento,
            'fecha_inicio' => $licencia->getAttribute('fecha_inicio') ?? $momento->format('Y-m-d'),
        ])->save();
    }
}
