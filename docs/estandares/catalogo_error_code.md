# Catalogo de error_code

Generado con `php artisan errores:catalogo` desde las excepciones de negocio.

| error_code | HTTP | Clase | Modulo | Claves de contexto |
|---|---|---|---|---|
| `abono_excede_saldo` | 422 | `App\Modules\CuentasCobrar\Exceptions\AbonoExcedeSaldoException` | CuentasCobrar | saldo_pendiente, monto_abono |
| `abono_pago_no_cuadra` | 422 | `App\Modules\Apartados\Exceptions\AbonoPagoNoCuadraException` | Apartados | monto, suma_pagos |
| `ajuste_puntos_invalido` | 422 | `App\Modules\CrmAvanzado\Exceptions\AjustePuntosInvalidoException` | CrmAvanzado | — |
| `apartado_estado_invalido` | 422 | `App\Modules\Apartados\Exceptions\ApartadoEstadoInvalidoException` | Apartados | apartado_id, estado_actual, accion |
| `apartado_saldo_insuficiente` | 422 | `App\Modules\Apartados\Exceptions\ApartadoSaldoInsuficienteException` | Apartados | apartado_id, total, total_abonado |
| `caja_no_abierta` | 422 | `App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException` | Tpv | sucursal_id |
| `caja_ya_abierta` | 422 | `App\Modules\Tpv\Exceptions\CajaYaAbiertaException` | Tpv | sucursal_id |
| `caja_ya_cerrada` | 422 | `App\Modules\Tpv\Exceptions\CajaYaCerradaException` | Tpv | caja_sesion_id |
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
| `cuota_ya_pagada` | 422 | `App\Modules\Crm\Exceptions\CuotaYaPagadaException` | Crm | plan_pago_id, cuota_id |
| `cupon_invalido` | 422 | `App\Modules\Precios\Exceptions\CuponInvalidoException` | Precios | codigo |
| `devolucion_excede_cantidad_vendida` | 422 | `App\Modules\Devoluciones\Exceptions\DevolucionExcedeCantidadVendidaException` | Devoluciones | venta_id, variante_id, solicitado, vendido |
| `devolucion_pago_no_cuadra` | 422 | `App\Modules\Devoluciones\Exceptions\DevolucionPagoNoCuadraException` | Devoluciones | diferencia, suma_pagos |
| `devolucion_sobre_venta_sombra` | 422 | `App\Modules\Devoluciones\Exceptions\DevolucionSobreVentaSombraException` | Devoluciones | venta_id |
| `devolucion_variante_no_vendida` | 422 | `App\Modules\Devoluciones\Exceptions\DevolucionVarianteNoVendidaException` | Devoluciones | venta_id, variante_id |
| `empleado_ya_existe` | 422 | `App\Modules\Payroll\Exceptions\EmpleadoYaExisteException` | Payroll | — |
| `gift_card_cancelada` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardCanceladaException` | GiftCards | — |
| `gift_card_expirada` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardExpiradaException` | GiftCards | — |
| `gift_card_saldo_insuficiente` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardSaldoInsuficienteException` | GiftCards | — |
| `gift_card_sin_saldo` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardSinSaldoException` | GiftCards | — |
| `gift_card_ya_cancelada` | 422 | `App\Modules\GiftCards\Exceptions\GiftCardYaCanceladaException` | GiftCards | — |
| `modulo_no_activo` | 403 | `App\Modules\Nucleo\Exceptions\ModuloNoActivoException` | Nucleo | — |
| `monto_invalido` | 422 | `App\Modules\GiftCards\Exceptions\MontoInvalidoException` | GiftCards | — |
| `nomina_ya_pagada` | 422 | `App\Modules\Payroll\Exceptions\NominaYaPagadaException` | Payroll | — |
| `nota_credito_expirada` | 422 | `App\Modules\NotasCredito\Exceptions\NotaCreditoExpiradaException` | NotasCredito | — |
| `nota_credito_saldo_insuficiente` | 422 | `App\Modules\NotasCredito\Exceptions\NotaCreditoSaldoInsuficienteException` | NotasCredito | — |
| `nota_credito_sin_saldo` | 422 | `App\Modules\NotasCredito\Exceptions\NotaCreditoSinSaldoException` | NotasCredito | — |
| `orden_produccion_no_completable` | 422 | `App\Modules\Produccion\Exceptions\OrdenProduccionNoCompletableException` | Produccion | — |
| `pago_cuota_insuficiente` | 422 | `App\Modules\Crm\Exceptions\PagoCuotaInsuficienteException` | Crm | cuota_id, monto_requerido, monto_recibido |
| `pago_excede_saldo` | 422 | `App\Modules\CuentasPagar\Exceptions\PagoExcedeSaldoException` | CuentasPagar | saldo_pendiente, monto_pago |
| `pago_excede_saldo_prestamo` | 422 | `App\Modules\Prestamos\Exceptions\PagoExcedeSaldoPrestamoException` | Prestamos | saldo_pendiente, monto_pago |
| `pago_no_cuadra` | 422 | `App\Modules\Tpv\Exceptions\PagoNoCuadraException` | Tpv | total, suma_pagos |
| `pedido_no_asignable` | 422 | `App\Modules\Delivery\Exceptions\PedidoNoAsignableException` | Delivery | — |
| `plan_pago_ya_activo` | 422 | `App\Modules\Crm\Exceptions\PlanPagoYaActivoException` | Crm | venta_id, plan_pago_id |
| `prestamo_ya_pagado` | 422 | `App\Modules\Prestamos\Exceptions\PrestamoPagadoException` | Prestamos | — |
| `puntos_insuficientes` | 422 | `App\Modules\CrmAvanzado\Exceptions\PuntosInsuficientesException` | CrmAvanzado | — |
| `puntos_no_generados` | 422 | `App\Modules\CrmAvanzado\Exceptions\PuntosNoGeneradosException` | CrmAvanzado | — |
| `sin_cliente` | 422 | `App\Modules\Cotizaciones\Exceptions\SinClienteException` | Cotizaciones | — |
| `sin_empleados` | 422 | `App\Modules\Payroll\Exceptions\SinEmpleadosException` | Payroll | — |
| `stock_insuficiente` | 422 | `App\Modules\Inventario\Exceptions\StockInsuficienteException` | Inventario | variante_id, sucursal_id, solicitado, disponible |
| `stock_insumos_insuficiente` | 422 | `App\Modules\Produccion\Exceptions\StockInsumosInsuficienteException` | Produccion | — |
| `sucursal_no_permitida` | 422 | `App\Modules\Nucleo\Exceptions\SucursalNoPermitidaException` | Nucleo | sucursal_id |
| `sucursal_requerida` | 422 | `App\Modules\Nucleo\Exceptions\SucursalRequeridaException` | Nucleo | — |
| `transicion_estado_invalida` | 422 | `App\Modules\Delivery\Exceptions\TransicionEstadoInvalidaException` | Delivery | — |
| `unidad_en_uso` | 422 | `App\Modules\UnidadesMedida\Exceptions\UnidadEnUsoException` | UnidadesMedida | — |
| `venta_total_negativo` | 422 | `App\Modules\Tpv\Exceptions\VentaTotalNegativoException` | Tpv | subtotal, descuento_manual, descuento_cupon |
| `venta_ya_anulada` | 422 | `App\Modules\Tpv\Exceptions\VentaYaAnuladaException` | Tpv | venta_id |
