/**
 * Codigos estables que el backend manda en cada excepcion de negocio
 * mapeada a 422 (ver bootstrap/app.php) a lo largo de todo el "pipeline"
 * de venta -- Tpv (CajaSesionNoAbiertaException, CajaYaAbiertaException,
 * PagoNoCuadraException, StockInsuficienteException, CuponInvalidoException),
 * Apartados (AbonoPagoNoCuadraException, ApartadoEstadoInvalidoException,
 * ApartadoSaldoInsuficienteException) y Devoluciones
 * (DevolucionPagoNoCuadraException, DevolucionSobreVentaSombraException) --
 * el frontend distingue el error por `error_code`, nunca parseando
 * `message`. Vive en Tpv (no en cada modulo por separado) porque
 * Apartados/Devoluciones ya dependen de Tpv (ApartadoService/
 * DevolucionService inyectan VentaService) y pueden recibir sus mismos
 * codigos de rebote (ej. registrar un cambio sin caja abierta).
 */
export type CodigoErrorTpv =
  | 'caja_no_abierta'
  | 'caja_ya_abierta'
  | 'pago_no_cuadra'
  | 'stock_insuficiente'
  | 'cupon_invalido'
  | 'abono_pago_no_cuadra'
  | 'apartado_estado_invalido'
  | 'apartado_saldo_insuficiente'
  | 'devolucion_pago_no_cuadra'
  | 'devolucion_sobre_venta_sombra';

export interface ErrorNegocioTpv {
  message: string;
  error_code: CodigoErrorTpv;
  [clave: string]: unknown;
}
