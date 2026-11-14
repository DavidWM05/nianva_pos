export type Tono = 'exito' | 'advertencia' | 'peligro' | 'info' | 'neutro';

export interface EstadoVisual {
  etiqueta: string;
  tono: Tono;
  icono: string;
}

/**
 * Registro unico estado -> { etiqueta, tono, icono } por entidad (UI-06).
 *
 * El estado "normal" de cada entidad es el valor por defecto de su columna
 * `estado` en la migracion, y va en `null`: no lleva badge. Un test lee las
 * migraciones del backend y falla si un enum gana un valor sin entrada aqui.
 */
export const REGISTRO_ESTADOS = {
  venta: {
    completada: null,
    anulada: { etiqueta: 'Anulada', tono: 'peligro', icono: 'pi pi-ban' },
  },
  apartado: {
    activo: null,
    completado: { etiqueta: 'Completado', tono: 'exito', icono: 'pi pi-check' },
    cancelado: { etiqueta: 'Cancelado', tono: 'peligro', icono: 'pi pi-times' },
  },
  corte: {
    abierta: null,
    cerrada: { etiqueta: 'Cerrada', tono: 'neutro', icono: 'pi pi-lock' },
  },
  cotizacion: {
    pendiente: null,
    convertida: { etiqueta: 'Convertida', tono: 'exito', icono: 'pi pi-check' },
    vencida: { etiqueta: 'Vencida', tono: 'advertencia', icono: 'pi pi-clock' },
    anulada: { etiqueta: 'Anulada', tono: 'peligro', icono: 'pi pi-ban' },
  },
  cuentaCobrar: {
    pendiente: null,
    pagada: { etiqueta: 'Pagada', tono: 'exito', icono: 'pi pi-check' },
    anulada: { etiqueta: 'Anulada', tono: 'peligro', icono: 'pi pi-ban' },
  },
  cuentaPagar: {
    pendiente: null,
    pagada: { etiqueta: 'Pagada', tono: 'exito', icono: 'pi pi-check' },
    anulada: { etiqueta: 'Anulada', tono: 'peligro', icono: 'pi pi-ban' },
  },
  cuota: {
    pendiente: null,
    pagada: { etiqueta: 'Pagada', tono: 'exito', icono: 'pi pi-check' },
    vencida: { etiqueta: 'Vencida', tono: 'advertencia', icono: 'pi pi-clock' },
  },
  giftCard: {
    activa: null,
    usada: { etiqueta: 'Usada', tono: 'neutro', icono: 'pi pi-check' },
    expirada: { etiqueta: 'Expirada', tono: 'advertencia', icono: 'pi pi-clock' },
    cancelada: { etiqueta: 'Cancelada', tono: 'peligro', icono: 'pi pi-times' },
  },
  notaCredito: {
    activa: null,
    usada_parcial: { etiqueta: 'Usada en parte', tono: 'info', icono: 'pi pi-percentage' },
    usada_total: { etiqueta: 'Usada', tono: 'neutro', icono: 'pi pi-check' },
    expirada: { etiqueta: 'Expirada', tono: 'advertencia', icono: 'pi pi-clock' },
    cancelada: { etiqueta: 'Cancelada', tono: 'peligro', icono: 'pi pi-times' },
  },
  nomina: {
    calculada: null,
    pagada: { etiqueta: 'Pagada', tono: 'exito', icono: 'pi pi-check' },
    cancelada: { etiqueta: 'Cancelada', tono: 'peligro', icono: 'pi pi-times' },
  },
  ordenProduccion: {
    pendiente: null,
    en_proceso: { etiqueta: 'En proceso', tono: 'info', icono: 'pi pi-cog' },
    completada: { etiqueta: 'Completada', tono: 'exito', icono: 'pi pi-check' },
    cancelada: { etiqueta: 'Cancelada', tono: 'peligro', icono: 'pi pi-times' },
  },
  pedido: {
    pendiente: null,
    preparando: { etiqueta: 'Preparando', tono: 'info', icono: 'pi pi-box' },
    en_camino: { etiqueta: 'En camino', tono: 'info', icono: 'pi pi-truck' },
    entregado: { etiqueta: 'Entregado', tono: 'exito', icono: 'pi pi-check' },
    cancelado: { etiqueta: 'Cancelado', tono: 'peligro', icono: 'pi pi-times' },
  },
  accionAuditoria: {
    create: { etiqueta: 'Creado', tono: 'exito', icono: 'pi pi-plus' },
    update: { etiqueta: 'Modificado', tono: 'info', icono: 'pi pi-pencil' },
    delete: { etiqueta: 'Eliminado', tono: 'peligro', icono: 'pi pi-trash' },
  },
  prestamo: {
    activo: null,
    pagado: { etiqueta: 'Pagado', tono: 'exito', icono: 'pi pi-check' },
    cancelado: { etiqueta: 'Cancelado', tono: 'peligro', icono: 'pi pi-times' },
  },
  licencia: {
    activa: null,
    prueba: { etiqueta: 'Prueba', tono: 'info', icono: 'pi pi-hourglass' },
    vencida: { etiqueta: 'Vencida', tono: 'advertencia', icono: 'pi pi-clock' },
    revocada: { etiqueta: 'Revocada', tono: 'peligro', icono: 'pi pi-ban' },
  },
} as const satisfies Record<string, Record<string, EstadoVisual | null>>;

export type EntidadConEstado = keyof typeof REGISTRO_ESTADOS;

/**
 * `null` si el estado es el normal de la entidad (sin badge). Un estado que
 * el registro no conoce se muestra tal cual en tono neutro: nunca se oculta.
 */
export function estadoVisual(entidad: EntidadConEstado, estado: string): EstadoVisual | null {
  const registro: Record<string, EstadoVisual | null> = REGISTRO_ESTADOS[entidad];

  if (estado in registro) {
    return registro[estado];
  }

  return { etiqueta: estado, tono: 'neutro', icono: 'pi pi-circle' };
}
