/** Espejo de InicioController::resumen(). */
export interface VentasHoyResumen {
  cantidad: number;
  total: number;
}

export interface ApartadoPorVencer {
  id: number;
  cliente_nombre: string | null;
  fecha_vencimiento: string;
  total: string;
  total_abonado: string;
}

export interface InicioResumen {
  ventas_hoy: VentasHoyResumen;
  apartados_por_vencer: ApartadoPorVencer[];
}
