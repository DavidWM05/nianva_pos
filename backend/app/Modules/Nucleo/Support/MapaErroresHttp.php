<?php

namespace App\Modules\Nucleo\Support;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Nucleo\Http\Middleware\CorrelationId;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * Sobre unico para los errores genericos de la API (API-03, SEG-11).
 *
 * El mapa status => error_code vive solo aqui. No se mapea por excepcion
 * concreta (API-04): las excepciones de negocio conservan su propio
 * error_code y las de validacion mantienen el formato nativo de Laravel.
 */
final class MapaErroresHttp
{
    public const MENSAJE_ERROR_INTERNO = 'Error interno del servidor.';

    /**
     * @var array<int, string>
     */
    private const CODIGOS = [
        400 => 'solicitud_invalida',
        401 => 'no_autenticado',
        403 => 'sin_permiso',
        404 => 'no_encontrado',
        405 => 'metodo_no_permitido',
        409 => 'conflicto',
        413 => 'contenido_demasiado_grande',
        415 => 'tipo_contenido_no_soportado',
        419 => 'sesion_expirada',
        422 => 'datos_invalidos',
        423 => 'dos_pasos_requeridos',
        429 => 'demasiadas_solicitudes',
        500 => 'error_interno',
        503 => 'servicio_no_disponible',
        504 => 'tiempo_agotado',
    ];

    /**
     * @return array<int, string>
     */
    public static function codigos(): array
    {
        return self::CODIGOS;
    }

    public static function codigo(int $status): ?string
    {
        return self::CODIGOS[$status] ?? null;
    }

    public static function respuesta(Throwable $e, Request $request): ?JsonResponse
    {
        if ($e instanceof ExcepcionNegocio
            || $e instanceof ValidationException
            || $e instanceof HttpResponseException) {
            return null;
        }

        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        $status = self::statusDe($e);

        if ($status < 400) {
            return null;
        }

        // En desarrollo Laravel puede seguir mostrando el detalle del 500.
        if ($status >= 500 && config('app.debug')) {
            return null;
        }

        $codigo = self::codigo($status);

        if ($codigo === null) {
            if ($status < 500) {
                return null;
            }

            $codigo = self::CODIGOS[500];
        }

        $cuerpo = [
            'message' => $status >= 500 ? self::MENSAJE_ERROR_INTERNO : self::mensajeDe($e, $status),
            'error_code' => $codigo,
        ];

        if ($status >= 500) {
            $cuerpo['correlation_id'] = self::correlacion($request);
        }

        return response()->json($cuerpo, $status);
    }

    private static function statusDe(Throwable $e): int
    {
        if ($e instanceof AuthenticationException) {
            return 401;
        }

        if ($e instanceof AuthorizationException) {
            return 403;
        }

        if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
            return 404;
        }

        if ($e instanceof HttpExceptionInterface) {
            return $e->getStatusCode();
        }

        return 500;
    }

    private static function mensajeDe(Throwable $e, int $status): string
    {
        // El mensaje nativo de ModelNotFoundException incluye el nombre de
        // la clase del modelo; no se filtra en produccion (SEG-11).
        if ($e instanceof ModelNotFoundException
            || ($e instanceof NotFoundHttpException && $e->getPrevious() instanceof ModelNotFoundException)) {
            return 'No encontrado.';
        }

        $mensaje = trim($e->getMessage());

        if ($mensaje !== '') {
            return $mensaje;
        }

        return Response::$statusTexts[$status] ?? 'Error';
    }

    private static function correlacion(Request $request): string
    {
        $id = $request->attributes->get(CorrelationId::ATRIBUTO);

        if (is_string($id) && $id !== '') {
            return $id;
        }

        $id = (string) Str::ulid();
        $request->attributes->set(CorrelationId::ATRIBUTO, $id);

        return $id;
    }
}
