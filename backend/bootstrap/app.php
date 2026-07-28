<?php

use App\Modules\Apartados\Exceptions\AbonoPagoNoCuadraException;
use App\Modules\Apartados\Exceptions\ApartadoEstadoInvalidoException;
use App\Modules\Apartados\Exceptions\ApartadoSaldoInsuficienteException;
use App\Modules\Cotizaciones\Exceptions\CotizacionNoEditableException;
use App\Modules\Cotizaciones\Exceptions\CotizacionVencidaException;
use App\Modules\Cotizaciones\Exceptions\CotizacionYaConvertidaException;
use App\Modules\Cotizaciones\Exceptions\SinClienteException;
use App\Modules\CuentasCobrar\Exceptions\AbonoExcedeSaldoException;
use App\Modules\CuentasCobrar\Exceptions\CuentaAnuladaException;
use App\Modules\CuentasCobrar\Exceptions\CuentaConAbonosException;
use App\Modules\CuentasCobrar\Exceptions\CuentaYaPagadaException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarAnuladaException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarConAbonosException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarYaPagadaException;
use App\Modules\CuentasPagar\Exceptions\PagoExcedeSaldoException;
use App\Modules\Delivery\Exceptions\PedidoNoAsignableException;
use App\Modules\Delivery\Exceptions\TransicionEstadoInvalidaException;
use App\Modules\Devoluciones\Exceptions\DevolucionPagoNoCuadraException;
use App\Modules\GiftCards\Exceptions\GiftCardCanceladaException;
use App\Modules\GiftCards\Exceptions\GiftCardExpiradaException;
use App\Modules\GiftCards\Exceptions\MontoInvalidoException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoExpiradaException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSinSaldoException;
use App\Modules\CrmAvanzado\Exceptions\AjustePuntosInvalidoException;
use App\Modules\CrmAvanzado\Exceptions\PuntosInsuficientesException;
use App\Modules\CrmAvanzado\Exceptions\PuntosNoGeneradosException;
use App\Modules\GiftCards\Exceptions\GiftCardSaldoInsuficienteException;
use App\Modules\GiftCards\Exceptions\GiftCardSinSaldoException;
use App\Modules\GiftCards\Exceptions\GiftCardYaCanceladaException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSaldoInsuficienteException;
use App\Modules\Payroll\Exceptions\EmpleadoYaExisteException;
use App\Modules\Payroll\Exceptions\NominaYaPagadaException;
use App\Modules\Payroll\Exceptions\SinEmpleadosException;
use App\Modules\Prestamos\Exceptions\PagoExcedeSaldoPrestamoException;
use App\Modules\Prestamos\Exceptions\PrestamoPagadoException;
use App\Modules\Produccion\Exceptions\OrdenProduccionNoCompletableException;
use App\Modules\Produccion\Exceptions\StockInsumosInsuficienteException;
use App\Modules\Devoluciones\Exceptions\DevolucionSobreVentaSombraException;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Nucleo\Exceptions\ModuloNoActivoException;
use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\UnidadesMedida\Exceptions\UnidadEnUsoException;
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

        // CxC — Cuentas por Cobrar
        $exceptions->render(fn (AbonoExcedeSaldoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'abono_excede_saldo',
            'saldo_pendiente' => $e->saldoPendiente,
            'monto_abono' => $e->montoAbono,
        ], 422));

        $exceptions->render(fn (CuentaYaPagadaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cuenta_ya_pagada',
        ], 422));

        $exceptions->render(fn (CuentaAnuladaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cuenta_anulada',
        ], 422));

        $exceptions->render(fn (CuentaConAbonosException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cuenta_con_abonos',
        ], 422));

        // CxP — Cuentas por Pagar
        $exceptions->render(fn (PagoExcedeSaldoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'pago_excede_saldo',
            'saldo_pendiente' => $e->saldoPendiente,
            'monto_pago' => $e->montoPago,
        ], 422));

        $exceptions->render(fn (CuentaPagarYaPagadaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cuenta_ya_pagada',
        ], 422));

        $exceptions->render(fn (CuentaPagarAnuladaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cuenta_anulada',
        ], 422));

        $exceptions->render(fn (CuentaPagarConAbonosException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cuenta_con_abonos',
        ], 422));

        // Delivery
        $exceptions->render(fn (TransicionEstadoInvalidaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'transicion_estado_invalida',
        ], 422));

        $exceptions->render(fn (PedidoNoAsignableException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'pedido_no_asignable',
        ], 422));

        // Gift Cards
        $exceptions->render(fn (MontoInvalidoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'monto_invalido',
        ], 422));

        $exceptions->render(fn (GiftCardExpiradaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'gift_card_expirada',
        ], 422));

        $exceptions->render(fn (GiftCardCanceladaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'gift_card_cancelada',
        ], 422));

        // Notas de Credito
        $exceptions->render(fn (NotaCreditoExpiradaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'nota_credito_expirada',
        ], 422));

        $exceptions->render(fn (NotaCreditoSinSaldoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'nota_credito_sin_saldo',
        ], 422));

        // Cotizaciones
        $exceptions->render(fn (CotizacionNoEditableException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cotizacion_no_editable',
        ], 422));

        $exceptions->render(fn (CotizacionVencidaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cotizacion_vencida',
        ], 422));

        $exceptions->render(fn (CotizacionYaConvertidaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'cotizacion_ya_convertida',
        ], 422));

        $exceptions->render(fn (SinClienteException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'sin_cliente',
        ], 422));

        // CRM Avanzado
        $exceptions->render(fn (AjustePuntosInvalidoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'ajuste_puntos_invalido',
        ], 422));

        $exceptions->render(fn (PuntosInsuficientesException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'puntos_insuficientes',
        ], 422));

        $exceptions->render(fn (PuntosNoGeneradosException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'puntos_no_generados',
        ], 422));

        // Gift Cards (adicionales)
        $exceptions->render(fn (GiftCardSaldoInsuficienteException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'gift_card_saldo_insuficiente',
        ], 422));

        $exceptions->render(fn (GiftCardYaCanceladaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'gift_card_ya_cancelada',
        ], 422));

        $exceptions->render(fn (GiftCardSinSaldoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'gift_card_sin_saldo',
        ], 422));

        // Notas de Credito (adicional)
        $exceptions->render(fn (NotaCreditoSaldoInsuficienteException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'nota_credito_saldo_insuficiente',
        ], 422));

        // Payroll
        $exceptions->render(fn (NominaYaPagadaException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'nomina_ya_pagada',
        ], 422));

        $exceptions->render(fn (EmpleadoYaExisteException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'empleado_ya_existe',
        ], 422));

        $exceptions->render(fn (SinEmpleadosException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'sin_empleados',
        ], 422));

        // Prestamos
        $exceptions->render(fn (PrestamoPagadoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'prestamo_ya_pagado',
        ], 422));

        $exceptions->render(fn (PagoExcedeSaldoPrestamoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'pago_excede_saldo_prestamo',
            'saldo_pendiente' => $e->saldoPendiente,
            'monto_pago' => $e->montoPago,
        ], 422));

        // Produccion
        $exceptions->render(fn (OrdenProduccionNoCompletableException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'orden_produccion_no_completable',
        ], 422));

        $exceptions->render(fn (StockInsumosInsuficienteException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'stock_insumos_insuficiente',
        ], 422));

        // Unidades de Medida
        $exceptions->render(fn (UnidadEnUsoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'unidad_en_uso',
        ], 422));

        // Feature Gating (ver ModuloActivo middleware)
        $exceptions->render(fn (ModuloNoActivoException $e) => response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'modulo_no_activo',
        ], 403));
    })->create();
