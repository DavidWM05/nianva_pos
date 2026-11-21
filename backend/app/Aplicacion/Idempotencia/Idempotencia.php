<?php

declare(strict_types=1);

namespace App\Aplicacion\Idempotencia;

use App\Modules\Nucleo\Exceptions\ClaveIdempotenciaInvalidaException;
use App\Modules\Nucleo\Exceptions\ConflictoIdempotenciaException;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

final class Idempotencia
{
    public function handle(Request $request, Closure $next): Response
    {
        $llave = $request->headers->get('Idempotency-Key');

        if ($llave === null) {
            return $next($request);
        }
        if (! Str::isUlid($llave)) {
            throw new ClaveIdempotenciaInvalidaException;
        }

        $usuario = $request->user();
        abort_if($usuario === null || $usuario->getAttribute('tenant_id') === null, 403);
        $identidad = ['tenant_id' => (int) $usuario->getAttribute('tenant_id'), 'llave' => strtolower($llave)];
        $huella = hash('sha256', json_encode([
            $usuario->getAuthIdentifier(),
            $usuario->getAttribute('sucursal_id'),
            $request->method(),
            $request->path(),
            $this->ordenar($request->all()),
        ], JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION));

        DB::beginTransaction();
        try {
            $vence = now()->addHours(24);
            $tabla = DB::table('solicitudes_idempotentes');
            // El índice único arbitra incluso la primera reserva simultánea.
            $tabla->upsert([$identidad + ['huella' => $huella, 'vence_en' => $vence]], array_keys($identidad), ['llave']);
            $fila = $tabla->where($identidad);
            $guardada = $fila->lockForUpdate()->sole();

            if ($guardada->vence_en > now()->toDateTimeString()) {
                if (! hash_equals($guardada->huella, $huella)) {
                    throw new ConflictoIdempotenciaException;
                }
                if ($guardada->estado_http !== null) {
                    $respuesta = new Response(
                        $guardada->cuerpo,
                        (int) $guardada->estado_http,
                        json_decode($guardada->cabeceras, true, 512, JSON_THROW_ON_ERROR),
                    );
                    DB::commit();

                    return $respuesta;
                }
            }

            $respuesta = $next($request);
            if (! $respuesta->isSuccessful()) {
                DB::rollBack();

                return $respuesta;
            }

            $fila->update([
                'huella' => $huella,
                'vence_en' => $vence,
                'estado_http' => $respuesta->getStatusCode(),
                'cuerpo' => $respuesta->getContent(),
                'cabeceras' => json_encode(
                    array_intersect_key($respuesta->headers->all(), array_flip(['content-type', 'location'])),
                    JSON_THROW_ON_ERROR,
                ),
            ]);
            DB::commit();

            return $respuesta;
        } catch (Throwable $error) {
            DB::rollBack();

            throw $error;
        }
    }

    /** @param array<mixed> $datos
     * @return array<mixed>
     */
    private function ordenar(array $datos): array
    {
        if (! array_is_list($datos)) {
            ksort($datos);
        }

        return array_map(fn (mixed $valor): mixed => is_array($valor) ? $this->ordenar($valor) : $valor, $datos);
    }
}
