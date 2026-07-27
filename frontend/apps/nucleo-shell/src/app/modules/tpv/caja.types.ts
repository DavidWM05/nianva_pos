/** Espejo de CajaSesionResource del backend (backend/app/Modules/Tpv). */
export type EstadoCaja = 'abierta' | 'cerrada';

export interface CajaSesion {
  id: number;
  sucursal_id: number;
  usuario_id: number;
  monto_apertura: string;
  monto_cierre: string | null;
  total_ventas_sistema: string | null;
  diferencia: string | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  estado: EstadoCaja;
}

/**
 * Vista en vivo de "ventas de la sesion, total acumulado" mientras la
 * caja sigue abierta -- ver CajaService::resumenSesion() en el backend.
 * Solo viaja junto a una sesion abierta (null si no hay ninguna).
 */
export interface CajaResumen {
  ventas_count: number;
  total_ventas: number;
  total_gastos: number;
}

export interface CajaPermisos {
  abrir: boolean;
  cerrar: boolean;
  gastos_ver: boolean;
  gastos_crear: boolean;
}

export interface CajaActual {
  sesion: CajaSesion | null;
  resumen: CajaResumen | null;
  permisos: CajaPermisos;
}
