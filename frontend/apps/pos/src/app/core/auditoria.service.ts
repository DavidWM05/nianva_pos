import { Injectable, inject } from '@angular/core';
import { AuditoriaRegistroService } from '@nianva/domain-auditoria';
import { AuditLogEntry, AuditLogSource } from '@nianva/ui-shared';
import { Observable } from 'rxjs';

/**
 * Implementacion real de AuditLogSource, la clase abstracta que pide
 * AuditLogViewerComponent por DI -- registrada en app.config.ts. ui-shared
 * no conoce esta clase, solo su contrato. La peticion es de
 * AuditoriaRegistroService (@nianva/domain-auditoria, ARQ-12c).
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService implements AuditLogSource {
  private readonly registro = inject(AuditoriaRegistroService);

  listar(tabla: string, registroId: number): Observable<AuditLogEntry[]> {
    return this.registro.listar(tabla, registroId);
  }
}
