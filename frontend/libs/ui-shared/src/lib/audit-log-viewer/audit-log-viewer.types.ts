import { Observable } from 'rxjs';

/**
 * Espejo de app.Modules.Auditoria.Models.Auditoria del backend
 * (ver backend/app/Modules/Auditoria). `cambios` es el JSON
 * { campo: { antes, despues } } que ya escribe AuditObserver.
 */
export interface AuditLogEntry {
  id: number;
  tabla_afectada: string;
  registro_id: number;
  accion: 'create' | 'update' | 'delete';
  usuario_id: number | null;
  usuario_nombre?: string;
  cambios: Record<string, { antes: unknown; despues: unknown }> | null;
  fecha: string;
}

/**
 * ui-shared no sabe donde vive el backend (la URL base es de la app, no
 * de la libreria) -- AuditLogViewerComponent pide esta clase abstracta por
 * DI, y la app la implementa contra HttpClient (ver
 * apps/pos/src/app/core/auditoria.service.ts) y la registra en
 * app.config.ts. Mismo motivo por el que ConfirmDialogService no importa
 * nada especifico de la app: mantiene la libreria reutilizable fuera de
 * este proyecto en particular.
 */
export abstract class AuditLogSource {
  abstract listar(tabla: string, registroId: number): Observable<AuditLogEntry[]>;
}
