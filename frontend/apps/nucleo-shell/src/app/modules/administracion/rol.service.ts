import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { Rol, RolesPagina, RolesPermisos } from './rol.types';

export interface RolFormPayload {
  nombre: string;
  descripcion?: string | null;
  permisos: number[];
}

/** Mismo contrato que ClienteService -- ver el reporte de Fase C. */
@Injectable({ providedIn: 'root' })
export class RolService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, busqueda: string): Observable<RolesPagina> {
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
      .get<{ data: Rol[]; meta: { total: number; permisos: RolesPermisos } }>(`${API_BASE_URL}/api/roles`, { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  /** Lista completa (sin paginar) para el selector de roles de UsuarioFormComponent. */
  listarTodos(): Observable<Rol[]> {
    return this.listar({ first: 0, rows: 100, sortField: null, sortOrder: null, filters: {} }, '').pipe(
      map((pagina) => pagina.data),
    );
  }

  obtener(id: number): Observable<{ rol: Rol; permisos: RolesPermisos }> {
    return this.http
      .get<{ data: Rol; meta: { permisos: RolesPermisos } }>(`${API_BASE_URL}/api/roles/${id}`)
      .pipe(map((r) => ({ rol: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: RolFormPayload): Observable<Rol> {
    return this.http.post<{ data: Rol }>(`${API_BASE_URL}/api/roles`, payload).pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: RolFormPayload): Observable<Rol> {
    return this.http.put<{ data: Rol }>(`${API_BASE_URL}/api/roles/${id}`, payload).pipe(map((r) => r.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/api/roles/${id}`);
  }
}
