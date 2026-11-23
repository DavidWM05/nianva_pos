# Catalogo de error_code

Generado con `php artisan errores:catalogo` desde las excepciones de negocio y el mapa generico de errores HTTP.

| error_code | HTTP | Clase | Modulo | Claves de contexto |
|---|---|---|---|---|
| `abono_excede_saldo` | 422 | `App\Modules\CuentasCobrar\Exceptions\AbonoExcedeSaldoException` | CuentasCobrar | saldo_pendiente, monto_abono |
| `abono_pago_no_cuadra` | 422 | `App\Modules\Apartados\Exceptions\AbonoPagoNoCuadraException` | Apartados | monto, suma_pagos |
| `ajuste_puntos_invalido` | 422 | `App\Modules\CrmAvanzado\Exceptions\AjustePuntosInvalidoException` | CrmAvanzado | — |
| `apartado_estado_invalido` | 422 | `App\Modules\Apartados\Exceptions\ApartadoEstadoInvalidoException` | Apartados | apartado_id, estado_actual, accion |
| `apartado_saldo_insuficiente` | 422 | `App\Modules\Apartados\Exceptions\ApartadoSaldoInsuficienteException` | Apartados | apartado_id, total, total_abonado |
| `atributo_en_uso` | 422 | `App\Modules\Inventario\Exceptions\AtributoEnUsoException` | Inventario | tipo, id |
| `caja_no_abierta` | 422 | `App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException` | Tpv | sucursal_id |
| `caja_ya_abierta` | 422 | `App\Modules\Tpv\Exceptions\CajaYaAbiertaException` | Tpv | sucursal_id |
| `caja_ya_cerrada` | 422 | `App\Modules\Tpv\Exceptions\CajaYaCerradaException` | Tpv | caja_sesion_id |
| `cliente_sistema` | 403 | `App\Modules\Crm\Exceptions\ClienteSistemaException` | Crm | cliente_id |
| `conflicto` | 409 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `contenido_demasiado_grande` | 413 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `conteo_metodo_faltante` | 422 | `App\Modules\Tpv\Exceptions\ConteoMetodoFaltanteException` | Tpv | caja_sesion_id, metodo_pago_id |
| `costo_no_disponible` | 422 | `App\Modules\Inventario\Exceptions\CostoNoDisponibleException` | Inventario | variante_id, sucursal_id |
| `cotizacion_no_editable` | 422 | `App\Modules\Cotizaciones\Exceptions\CotizacionNoEditableException` | Cotizaciones | — |
| `cotizacion_total_negativo` | 422 | `App\Modules\Cotizaciones\Exceptions\CotizacionTotalNegativoException` | Cotizaciones | subtotal, descuento |
| `cotizacion_vencida` | 422 | `App\Modules\Cotizaciones\Exceptions\CotizacionVencidaException` | Cotizaciones | — |
| `cotizacion_ya_convertida` | 422 | `App\Modules\Cotizaciones\Exceptions\CotizacionYaConvertidaException` | Cotizaciones | — |
| `cuenta_anulada` | 422 | `App\Modules\CuentasCobrar\Exceptions\CuentaAnuladaException` | CuentasCobrar | — |
| `cuenta_con_abonos` | 422 | `App\Modules\CuentasCobrar\Exceptions\CuentaConAbonosException` | CuentasCobrar | — |
| `cuenta_pagar_anulada` | 422 | `App\Modules\CuentasPagar\Exceptions\CuentaPagarAnuladaException` | CuentasPagar | — |
| `cuenta_pagar_con_abonos` | 422 | `App\Modules\CuentasPagar\Exceptions\CuentaPagarConAbonosException` | CuentasPagar | — |
| `cuenta_pagar_ya_pagada` | 422 | `App\Modules\CuentasPagar\Exceptions\CuentaPagarYaPagadaException` | CuentasPagar | — |
| `cuenta_ya_pagada` | 422 | `App\Modules\CuentasCobrar\Exceptions\CuentaYaPagadaException` | CuentasCobrar | — |
| `cuota_ya_pagada` | 422 | `App\Modules\VentasPlazos\Exceptions\CuotaYaPagadaException` | VentasPlazos | plan_pago_id, cuota_id |
| `cupon_invalido` | 422 | `App\Modules\Precios\Exceptions\CuponInvalidoException` | Precios | codigo |
| `cupon_no_combinable` | 422 | `App\Modules\Precios\Exceptions\CuponNoCombinableException` | Precios | codigo |
| `datos_invalidos` | 422 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `demasiadas_solicitudes` | 429 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `desactivar_propio_usuario` | 403 | `App\Modules\Nucleo\Exceptions\DesactivarPropioUsuarioException` | Nucleo | usuario_id |
| `devolucion_excede_cantidad_vendida` | 422 | `App\Modules\Devoluciones\Exceptions\DevolucionExcedeCantidadVendidaException` | Devoluciones | venta_id, variante_id, solicitado, vendido |
| `devolucion_pago_no_cuadra` | 422 | `App\Modules\Devoluciones\Exceptions\DevolucionPagoNoCuadraException` | Devoluciones | diferencia, suma_pagos |
| `devolucion_sobre_venta_sombra` | 422 | `App\Modules\Devoluciones\Exceptions\DevolucionSobreVentaSombraException` | Devoluciones | venta_id |
| `devolucion_variante_no_vendida` | 422 | `App\Modules\Devoluciones\Exceptions\DevolucionVarianteNoVendidaException` | Devoluciones | venta_id, variante_id |
| `dos_pasos_requeridos` | 423 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `empleado_ya_existe` | 422 | `App\Modules\Payroll\Exceptions\EmpleadoYaExisteException` | Payroll | — |
| `error_interno` | 500 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `foto_incompleta` | 422 | `App\Modules\Nucleo\Exceptions\FotoIncompletaException` | Nucleo | campo, variante_id |
| `gift_card_cancelada` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardCanceladaException` | GiftCards | — |
| `gift_card_expirada` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardExpiradaException` | GiftCards | — |
| `gift_card_saldo_insuficiente` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardSaldoInsuficienteException` | GiftCards | — |
| `gift_card_sin_saldo` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardSinSaldoException` | GiftCards | — |
| `gift_card_ya_cancelada` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardYaCanceladaException` | GiftCards | — |
| `idempotencia_clave_invalida` | 422 | `App\Modules\Nucleo\Exceptions\ClaveIdempotenciaInvalidaException` | Nucleo | — |
| `idempotencia_conflicto` | 409 | `App\Modules\Nucleo\Exceptions\ConflictoIdempotenciaException` | Nucleo | — |
| `libro_inmutable` | 409 | `App\Modules\Nucleo\Exceptions\LibroInmutableException` | Nucleo | libro, operacion |
| `lista_precio_no_disponible` | 422 | `App\Modules\Precios\Exceptions\ListaPrecioNoDisponibleException` | Precios | lista_precio_id |
| `metodo_efectivo_no_existe` | 422 | `App\Modules\Nucleo\Exceptions\MetodoEfectivoNoExisteException` | Nucleo | — |
| `metodo_no_permitido` | 405 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `modulo_no_activo` | 403 | `App\Modules\Nucleo\Exceptions\ModuloNoActivoException` | Nucleo | — |
| `monto_invalido` | 422 | `App\Modules\GiftCards\Exceptions\MontoInvalidoException` | GiftCards | — |
| `no_autenticado` | 401 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `no_encontrado` | 404 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `nomina_ya_pagada` | 422 | `App\Modules\Payroll\Exceptions\NominaYaPagadaException` | Payroll | — |
| `nota_credito_expirada` | 422 | `App\Modules\NotasCredito\Exceptions\NotaCreditoExpiradaException` | NotasCredito | — |
| `nota_credito_saldo_insuficiente` | 422 | `App\Modules\NotasCredito\Exceptions\NotaCreditoSaldoInsuficienteException` | NotasCredito | — |
| `nota_credito_sin_saldo` | 422 | `App\Modules\NotasCredito\Exceptions\NotaCreditoSinSaldoException` | NotasCredito | — |
| `orden_produccion_no_completable` | 422 | `App\Modules\Produccion\Exceptions\OrdenProduccionNoCompletableException` | Produccion | — |
| `pago_cuota_insuficiente` | 422 | `App\Modules\VentasPlazos\Exceptions\PagoCuotaInsuficienteException` | VentasPlazos | cuota_id, monto_requerido, monto_recibido |
| `pago_excede_saldo` | 422 | `App\Modules\CuentasPagar\Exceptions\PagoExcedeSaldoException` | CuentasPagar | saldo_pendiente, monto_pago |
| `pago_excede_saldo_prestamo` | 422 | `App\Modules\Prestamos\Exceptions\PagoExcedeSaldoPrestamoException` | Prestamos | saldo_pendiente, monto_pago |
| `pago_no_cuadra` | 422 | `App\Modules\Tpv\Exceptions\PagoNoCuadraException` | Tpv | total, suma_pagos |
| `pedido_no_asignable` | 422 | `App\Modules\Delivery\Exceptions\PedidoNoAsignableException` | Delivery | — |
| `pin_caja_incorrecto` | 422 | `App\Modules\Nucleo\Exceptions\PinCajaIncorrectoException` | Nucleo | — |
| `pin_caja_intentos_agotados` | 429 | `App\Modules\Nucleo\Exceptions\PinCajaIntentosAgotadosException` | Nucleo | — |
| `pin_caja_no_configurado` | 409 | `App\Modules\Nucleo\Exceptions\PinCajaNoConfiguradoException` | Nucleo | — |
| `plan_pago_ya_activo` | 422 | `App\Modules\VentasPlazos\Exceptions\PlanPagoYaActivoException` | VentasPlazos | venta_id, plan_pago_id |
| `prestamo_ya_pagado` | 422 | `App\Modules\Prestamos\Exceptions\PrestamoPagadoException` | Prestamos | — |
| `proyeccion_no_actualizada` | 409 | `App\Modules\Nucleo\Exceptions\ProyeccionNoActualizadaException` | Nucleo | proyeccion, id |
| `puntos_insuficientes` | 422 | `App\Modules\CrmAvanzado\Exceptions\PuntosInsuficientesException` | CrmAvanzado | — |
| `puntos_no_generados` | 422 | `App\Modules\CrmAvanzado\Exceptions\PuntosNoGeneradosException` | CrmAvanzado | — |
| `recarga_pago_no_cuadra` | 422 | `App\Modules\GiftCards\Exceptions\RecargaPagoNoCuadraException` | GiftCards | monto, suma_pagos |
| `reporte_exportacion_limite` | 422 | `App\Modules\Metricas\Exceptions\LimiteExportacionReporteException` | Metricas | limite |
| `servicio_no_disponible` | 503 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `sesion_bloqueada` | 423 | `App\Modules\Nucleo\Exceptions\SesionBloqueadaException` | Nucleo | — |
| `sesion_expirada` | 419 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `sesion_inactiva` | 401 | `App\Modules\Nucleo\Exceptions\SesionInactivaException` | Nucleo | — |
| `sin_cliente` | 422 | `App\Modules\Cotizaciones\Exceptions\SinClienteException` | Cotizaciones | — |
| `sin_empleados` | 422 | `App\Modules\Payroll\Exceptions\SinEmpleadosException` | Payroll | — |
| `sin_permiso` | 403 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `solicitud_invalida` | 400 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `stock_insuficiente` | 422 | `App\Modules\Inventario\Exceptions\StockInsuficienteException` | Inventario | variante_id, sucursal_id, solicitado, disponible |
| `stock_insumos_insuficiente` | 422 | `App\Modules\Produccion\Exceptions\StockInsumosInsuficienteException` | Produccion | — |
| `sucursal_no_permitida` | 422 | `App\Modules\Nucleo\Exceptions\SucursalNoPermitidaException` | Nucleo | sucursal_id |
| `sucursal_requerida` | 422 | `App\Modules\Nucleo\Exceptions\SucursalRequeridaException` | Nucleo | — |
| `supervisor_intentos_agotados` | 429 | `App\Modules\Nucleo\Exceptions\SupervisorIntentosAgotadosException` | Nucleo | — |
| `supervisor_invalido` | 403 | `App\Modules\Nucleo\Exceptions\SupervisorInvalidoException` | Nucleo | — |
| `supervisor_requerido` | 403 | `App\Modules\Nucleo\Exceptions\SupervisorRequeridoException` | Nucleo | — |
| `tiempo_agotado` | 504 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `tiene_movimientos` | 422 | `App\Modules\Nucleo\Exceptions\TieneMovimientosException` | Nucleo | entidad, id |
| `tipo_contenido_no_soportado` | 415 | `App\Modules\Nucleo\Support\MapaErroresHttp` | Nucleo | - |
| `transicion_estado_invalida` | 422 | `App\Modules\Delivery\Exceptions\TransicionEstadoInvalidaException` | Delivery | — |
| `ultimo_admin` | 422 | `App\Modules\Nucleo\Exceptions\UltimoAdminException` | Nucleo | usuario_id |
| `unidad_en_uso` | 422 | `App\Modules\UnidadesMedida\Exceptions\UnidadEnUsoException` | UnidadesMedida | — |
| `unidad_pieza_no_existe` | 409 | `App\Modules\Inventario\Exceptions\UnidadPiezaNoExisteException` | Inventario | variante_id |
| `venta_total_negativo` | 422 | `App\Modules\Tpv\Exceptions\VentaTotalNegativoException` | Tpv | subtotal, descuento_manual, descuento_cupon |
| `venta_ya_anulada` | 422 | `App\Modules\Tpv\Exceptions\VentaYaAnuladaException` | Tpv | venta_id |
