<?php

use App\Modules\Apartados\Exceptions\AbonoPagoNoCuadraException;
use App\Modules\Apartados\Exceptions\ApartadoEstadoInvalidoException;
use App\Modules\Apartados\Exceptions\ApartadoSaldoInsuficienteException;
use App\Modules\Devoluciones\Exceptions\DevolucionPagoNoCuadraException;
use App\Modules\Devoluciones\Exceptions\DevolucionSobreVentaSombraException;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Nucleo\Http\Middleware\ResolveTenant;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Exceptions\CajaYaAbiertaException;
use App\Modules\Tpv\Exceptions\PagoNoCuadraException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
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

        // Excepciones de negocio de Tpv/Inventario/Precios (ver VentaService,
        // CajaService, PrecioService): sin esto renderizaban como 500
        // generico -- son RuntimeException planas, sin render() propio, y no
        // habia Handler.php ni registro previo aqui. El frontend distingue
        // el error especifico via `error_code` (no parseando `message`),
        // asi que cada uno mapea a su propio codigo estable.
        $exceptions->render(fn (CajaSesionNoAbiertaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'caja_no_abierta',
            'sucursal_id' => $e->sucursalId,
        ], 422));

        $exceptions->render(fn (CajaYaAbiertaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'caja_ya_abierta',
            'sucursal_id' => $e->sucursalId,
        ], 422));

        $exceptions->render(fn (PagoNoCuadraException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'pago_no_cuadra',
            'total' => $e->total,
            'suma_pagos' => $e->sumaPagos,
        ], 422));

        $exceptions->render(fn (StockInsuficienteException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'stock_insuficiente',
            'variante_id' => $e->varianteId,
            'sucursal_id' => $e->sucursalId,
            'solicitado' => $e->solicitado,
            'disponible' => $e->disponible,
        ], 422));

        $exceptions->render(fn (CuponInvalidoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cupon_invalido',
            'codigo' => $e->codigo,
        ], 422));

        // Apartados (ver ApartadoService): mismo esquema error_code estable.
        $exceptions->render(fn (AbonoPagoNoCuadraException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'abono_pago_no_cuadra',
            'monto' => $e->monto,
            'suma_pagos' => $e->sumaPagos,
        ], 422));

        $exceptions->render(fn (ApartadoEstadoInvalidoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'apartado_estado_invalido',
            'apartado_id' => $e->apartadoId,
            'estado_actual' => $e->estadoActual,
            'accion' => $e->accion,
        ], 422));

        $exceptions->render(fn (ApartadoSaldoInsuficienteException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'apartado_saldo_insuficiente',
            'apartado_id' => $e->apartadoId,
            'total' => $e->total,
            'total_abonado' => $e->totalAbonado,
        ], 422));

        // Devoluciones (ver DevolucionService): mismo esquema error_code estable.
        $exceptions->render(fn (DevolucionPagoNoCuadraException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'devolucion_pago_no_cuadra',
            'diferencia' => $e->diferencia,
            'suma_pagos' => $e->sumaPagos,
        ], 422));

        $exceptions->render(fn (DevolucionSobreVentaSombraException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'devolucion_sobre_venta_sombra',
            'venta_id' => $e->ventaId,
        ], 422));
    })->create();
