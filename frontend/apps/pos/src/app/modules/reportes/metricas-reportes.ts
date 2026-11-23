import type { RespuestaDe } from '@nianva/api-contrato';

export const metricasReportes = {
  ventas: ['totales', 'rentabilidad', 'por_dia', 'por_sucursal', 'por_metodo_pago', 'top_productos', 'detalle'],
  'cuentas-cobrar': ['total_pendiente', 'total_vencido', 'por_antiguedad', 'por_cliente', 'detalle'],
  'cuentas-pagar': ['total_pendiente', 'total_vencido', 'por_antiguedad', 'por_proveedor', 'detalle'],
  crm: ['clientes_por_segmento', 'interacciones_por_tipo', 'loyalty', 'detalle'],
} as const satisfies {
  ventas: readonly (keyof RespuestaDe<'/ventas/reporte', 'get'>['data'])[];
  'cuentas-cobrar': readonly (keyof RespuestaDe<'/cuentas-cobrar/reporte', 'get'>['data'])[];
  'cuentas-pagar': readonly (keyof RespuestaDe<'/cuentas-pagar/reporte', 'get'>['data'])[];
  crm: readonly (keyof RespuestaDe<'/crm/reporte', 'get'>['data'])[];
};
