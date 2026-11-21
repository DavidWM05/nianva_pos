import { components, CuerpoDe } from '@nianva/api-contrato';

export type CajaConteo = CuerpoDe<'/caja/{cajaSesion}/cerrar', 'patch'>['conteos'][number];
export type CajaMetodoSaldo = components['schemas']['CajaSaldoResource'];
export type CajaMetodoCierre = components['schemas']['CajaCierreMetodoResource'];

/** Espejo de CajaSesionResource del backend (backend/app/Modules/Tpv). */
export type EstadoCaja = 'abierta' | 'cerrada';

export interface CajaSesion {
  folio?: components['schemas']['CajaSesionResource']['folio'];
  /** DAT-08: ulid de la sesión. */
  id: string;
  /** D-3, transitorio: número visible (= id interno); lo reemplaza el folio de DAT-07. */
  numero: number;
  sucursal_id: number;
  usuario_id: number;
  monto_apertura: string;
  monto_cierre: string | null;
  total_teorico?: string | null;
  metodos?: CajaMetodoCierre[];
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
  metodos?: CajaMetodoSaldo[];
  total_ventas: string;
  total_gastos: string;
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

/**
 * Antes de API-02a
 * Solo viaja en la respuesta de CajaController::cerrar() -- son floats de
 * PHP calculados en el Controller (no atributos de un modelo con cast
 * decimal como el resto de CajaSesion), asi que llegan como number, no
 * como string.
 */
export interface CajaDesglose {
  total_gastos: string;
  total_abonos_cxc: string;
  total_recargas_gc: string;
  total_pagos_cxp: string;
}
