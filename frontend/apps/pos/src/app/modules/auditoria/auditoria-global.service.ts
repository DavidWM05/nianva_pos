import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuditLogEntry, DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { AuditoriaGlobalFiltros } from './auditoria-global.types';

export interface AuditoriaGlobalPagina {
  data: AuditLogEntry[];
  total: number;
  tablas: string[];
}

/**
 * Navegador global de auditoria (Fase C, punto 5) -- NO reutiliza
 * AuditLogSource/AuditoriaService (core/auditoria.service.ts): esa
 * abstraccion esta atada a la firma por-registro (tabla+registroId) que
 * pide AuditLogViewerComponent, y forzarla a soportar tambien un modo
 * "listar todo, paginado, con filtros" la hubiera vuelto confusa para su
 * unico consumidor real (el widget embebido). Este es un servicio nuevo
 * y separado, mismo GET /api/auditoria/global del backend.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaGlobalService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, filtros: AuditoriaGlobalFiltros): Observable<AuditoriaGlobalPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);
    if (filtros.tabla) {
      params = params.set('tabla', filtros.tabla);
    }
    if (filtros.usuario_id) {
      params = params.set('usuario_id', filtros.usuario_id);
    }
    if (filtros.fecha_desde) {
      params = params.set('fecha_desde', filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      params = params.set('fecha_hasta', filtros.fecha_hasta);
    }

    return this.http
      .get<{ data: AuditLogEntry[]; meta: { total: number; tablas: string[] } }>(urlApi(`/auditoria/global`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, tablas: r.meta.tablas })));
  }
}
