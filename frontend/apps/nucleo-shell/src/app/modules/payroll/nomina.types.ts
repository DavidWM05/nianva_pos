/** 'cancelada' existe en el enum de BD pero no hay endpoint para llegar a ese estado -- estado muerto, como 'cancelado' en Prestamo antes de que existiera anular(). */
export type EstadoNomina = 'calculada' | 'pagada' | 'cancelada';

export interface NominaDetalleEmpleado {
  id: number;
  usuario: { id: number; nombre: string } | null;
}

export interface NominaDetalle {
  id: number;
  empleado: NominaDetalleEmpleado | null;
  dias_trabajados: number;
  percepciones: string;
  deducciones: string;
  neto: string;
}

export interface Nomina {
  id: number;
  periodo_inicio: string;
  periodo_fin: string;
  total_percepciones: string;
  total_deducciones: string;
  total_neto: string;
  estado: EstadoNomina;
  fecha_pago: string | null;
  /** Solo viaja en index()/show() -- ambos cargan detalles.empleado.usuario. */
  detalles?: NominaDetalle[];
}

export interface GenerarNominaPayload {
  sucursal_id: number;
  periodo_inicio: string;
  periodo_fin: string;
}
