import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuditLogEntry, AuditLogSource } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from './api-config';

/**
 * Implementacion real (HttpClient + API_BASE_URL) de AuditLogSource, la
 * clase abstracta que pide AuditLogViewerComponent por DI -- registrada en
 * app.config.ts. ui-shared no conoce esta clase, solo su contrato.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService implements AuditLogSource {
  private readonly http = inject(HttpClient);

  listar(tabla: string, registroId: number): Observable<AuditLogEntry[]> {
    return this.http
      .get<{ data: AuditLogEntry[] }>(`${API_BASE_URL}/api/auditoria`, {
        params: { tabla, registro_id: String(registroId) },
      })
      .pipe(map((respuesta) => respuesta.data));
  }
}
