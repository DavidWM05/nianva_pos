/**
 * Espejo de CrmAvanzadoController (backend/app/Modules/CrmAvanzado) --
 * modulo de extension del CRM (interacciones + loyalty), no el Cliente
 * base (ver cliente.types.ts). Vive en modules/crm porque hoy no hay
 * pantallas propias para este modulo, solo tabs dentro de
 * ClienteDetalleComponent (ver el reporte, seccion "Detalle de Cliente").
 */
export type TipoInteraccion = 'llamada' | 'email' | 'whatsapp' | 'nota' | 'visita';

export interface CrmInteraccionUsuarioResumen {
  id: number;
  nombre: string;
}

export interface CrmInteraccion {
  id: number;
  cliente_id: number;
  /**
   * Casi siempre ausente: CrmAvanzadoService::obtenerInteracciones() nunca
   * hace ->with('usuario'), y CrmInteraccionResource solo expone este campo
   * via whenLoaded() -- el backend simplemente nunca lo manda hoy. Se deja
   * tipado como opcional (no se oculta el campo del contrato) para que la
   * vista lo muestre el dia que el Service cargue la relacion, sin volver a
   * tocar este archivo.
   */
  usuario?: CrmInteraccionUsuarioResumen;
  tipo: TipoInteraccion;
  observacion: string;
  fecha: string;
}

export interface InteraccionFormPayload {
  tipo: TipoInteraccion;
  observacion: string;
}

export type TipoLoyaltyTransaccion = 'ganados' | 'canjeados' | 'vencidos' | 'ajuste';

/** Fila cruda de LoyaltyTransaccion -- CrmAvanzadoController::loyalty() la devuelve sin pasar por un Resource. */
export interface LoyaltyTransaccion {
  id: number;
  cliente_id: number;
  tipo: TipoLoyaltyTransaccion;
  puntos: number;
  referencia_tabla: string | null;
  referencia_id: number | null;
  expira_en: string | null;
  created_at: string;
}

export interface LoyaltyResumen {
  cliente: { id: number; nombre: string };
  puntos_loyalty: number;
  puntos_acumulados: number;
  historial: LoyaltyTransaccion[];
}

export interface AjustarPuntosPayload {
  puntos: number;
  motivo: string;
}

export type SegmentoCliente = 'nuevo' | 'frecuente' | 'vip' | 'inactivo';

/** clave ausente = 0 -- CrmAvanzadoController::reporte() arma esto con pluck('total', 'tipo'), solo incluye tipos con al menos 1 interaccion. */
export type ReporteInteraccionesPorTipo = Partial<Record<TipoInteraccion, number>>;

export interface ReporteCrmLoyalty {
  puntos_ganados_total: number;
  puntos_canjeados_total: number;
  puntos_vencidos_total: number;
  saldo_actual_total: number;
}

export interface ReporteCrmCampana {
  id: number;
  asunto: string;
  segmento: SegmentoCliente | 'todos' | null;
  destinatarios: number;
  enviado_en: string;
}

/** CrmAvanzadoController::reporte() -- segmento calculado al vuelo, sin depender de Cliente.segmento (nunca se recalcula hoy). */
export interface ReporteCrm {
  clientes_por_segmento: Record<SegmentoCliente, number>;
  interacciones_por_tipo: ReporteInteraccionesPorTipo;
  loyalty: ReporteCrmLoyalty;
  campanas_recientes: ReporteCrmCampana[];
}
