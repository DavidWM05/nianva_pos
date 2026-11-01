<?php

namespace App\Modules\Nucleo\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Genera un id de correlacion por request (SEG-11). Nunca se toma el valor
 * que mande el cliente: el que aparece en el log y en la respuesta siempre
 * lo genera el servidor.
 */
class CorrelationId
{
    public const ATRIBUTO = 'correlation_id';

    public const CABECERA = 'X-Correlation-Id';

    public function handle(Request $request, Closure $next): Response
    {
        $id = (string) Str::ulid();

        $request->attributes->set(self::ATRIBUTO, $id);
        Log::withContext([self::ATRIBUTO => $id]);

        $response = $next($request);
        $response->headers->set(self::CABECERA, $id);

        return $response;
    }
}
