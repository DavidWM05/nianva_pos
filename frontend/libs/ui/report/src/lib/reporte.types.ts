export interface CambioReporte {
  desde: string | null;
  hasta: string | null;
  sucursalId: number | null;
}

export interface SucursalReporte {
  id: number;
  nombre: string;
}

export type EstadoReporte = 'cargando' | 'error' | 'listo';

export function fechaComoIso(fecha: Date | null | undefined): string | null {
  if (! (fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    return null;
  }

  const anio = fecha.getFullYear();
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}
