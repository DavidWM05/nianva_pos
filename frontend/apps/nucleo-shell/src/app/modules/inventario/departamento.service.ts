import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { Departamento, DepartamentosPagina, DepartamentosPermisos } from './departamento.types';

export interface DepartamentoFormPayload {
  nombre: string;
  descripcion?: string | null;
}

/** Mismo contrato que CategoriaService -- ver el reporte de Fase C. */
@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, busqueda: string): Observable<DepartamentosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);
    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (busqueda.trim()) {
      params = params.set('filtro_nombre', busqueda.trim());
    }

    return this.http
      .get<{ data: Departamento[]; meta: { total: number; permisos: DepartamentosPermisos } }>(
        `${API_BASE_URL}/api/departamentos`,
        { params },
      )
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<{ departamento: Departamento; permisos: DepartamentosPermisos }> {
    return this.http
      .get<{ data: Departamento; meta: { permisos: DepartamentosPermisos } }>(`${API_BASE_URL}/api/departamentos/${id}`)
      .pipe(map((r) => ({ departamento: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: DepartamentoFormPayload): Observable<Departamento> {
    return this.http.post<{ data: Departamento }>(`${API_BASE_URL}/api/departamentos`, payload).pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: DepartamentoFormPayload): Observable<Departamento> {
    return this.http
      .put<{ data: Departamento }>(`${API_BASE_URL}/api/departamentos/${id}`, payload)
      .pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<Departamento> {
    return this.http
      .patch<{ data: Departamento }>(`${API_BASE_URL}/api/departamentos/${id}/desactivar`, {})
      .pipe(map((r) => r.data));
  }
}
