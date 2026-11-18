import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { RespuestaDe } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';
import { Observable, map } from 'rxjs';

/** Una entrada de GET /auditoria, tal como la publica el contrato. */
export type EntradaAuditoriaRegistro = RespuestaDe<'/auditoria', 'get'>['data'][number];

/**
 * La auditoria de un registro (GET /auditoria?tabla=&registro_id=). La consume AuditoriaService
 * de la app, que implementa AuditLogSource para AuditLogViewerComponent (ARQ-12c).
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaRegistroService {
  private readonly http = inject(HttpClient);

  listar(tabla: string, registroId: number): Observable<EntradaAuditoriaRegistro[]> {
    return this.http
      .get<RespuestaDe<'/auditoria', 'get'>>(urlApi(`/auditoria`), {
        params: { tabla, registro_id: String(registroId) },
      })
      .pipe(map((respuesta) => respuesta.data));
  }
}
