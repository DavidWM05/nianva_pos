<?php

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Nucleo\Http\Middleware\CorrelationId;
use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\Nucleo\Http\Middleware\ResolveTenant;
use App\Modules\Nucleo\Support\MapaErroresHttp;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // SEG-11: todas las respuestas, incluidas las de error, llevan el id
        // de correlacion generado por el servidor.
        $middleware->prepend(CorrelationId::class);

        // Habilita la autenticacion SPA de Sanctum (cookie httpOnly + CSRF)
        // en el grupo 'api': agrega EnsureFrontendRequestsAreStateful, que
        // hace que 'auth:sanctum' reconozca la sesion de 'web' para
        // peticiones que vienen de SANCTUM_STATEFUL_DOMAINS -- nunca
        // tokens Bearer en localStorage.
        $middleware->statefulApi();

        // Estructural, no opt-in: toda ruta web/api resuelve el tenant
        // automaticamente. ResolveTenant no hace nada si no hay usuario
        // autenticado, asi que es seguro aplicarlo a rutas de invitado
        // tambien -- nadie tiene que acordarse de agregarlo ruta por ruta.
        $middleware->appendToGroup('web', ResolveTenant::class);
        $middleware->appendToGroup('api', ResolveTenant::class);

        $middleware->alias(['modulo' => ModuloActivo::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // api/* siempre responde JSON (aunque el cliente no mande Accept
        // correcto) + cualquier request que explicitamente pida JSON --
        // esto ultimo es lo que faltaba para /login, /login/2fa-verify,
        // /password/*: viven en routes/web.php (no 'api/*'), y sin
        // expectsJson() aqui, una ValidationException ahi caia al
        // comportamiento default de Laravel (redirect 302), no 422 JSON.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Toda excepcion de negocio declara su error_code, status y contexto
        // (API-03, API-04): un solo manejador generico evita el mapeo por
        // excepcion que crecia con cada modulo.
        $exceptions->render(fn (ExcepcionNegocio $e) => response()->json([
            ...$e->contexto(),
            'message' => $e->getMessage(),
            'error_code' => $e->errorCode(),
        ], $e->status()));

        // API-03/SEG-11: el resto de errores JSON usa el sobre generico.
        // El mapa vive en Nucleo/Support/MapaErroresHttp, no aqui.
        $exceptions->render(fn (Throwable $e, Request $request) => MapaErroresHttp::respuesta($e, $request));

        $exceptions->respond(function (Response $response, Throwable $e, Request $request): Response {
            $id = $request->attributes->get(CorrelationId::ATRIBUTO);

            if (is_string($id)) {
                $response->headers->set(CorrelationId::CABECERA, $id);
            }

            return $response;
        });
    })->create();
