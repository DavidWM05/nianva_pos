import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { Categoria, CategoriasPagina, CategoriasPermisos } from './categoria.types';

export interface CategoriaFormPayload {
  nombre: string;
  descripcion?: string | null;
}

/** Mismo contrato que ClienteService -- ver el reporte de CRM/Precios. */
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, busqueda: string): Observable<CategoriasPagina> {
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
      .get<{ data: Categoria[]; meta: { total: number; permisos: CategoriasPermisos } }>(urlApi(`/categorias`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<{ categoria: Categoria; permisos: CategoriasPermisos }> {
    return this.http
      .get<{ data: Categoria; meta: { permisos: CategoriasPermisos } }>(urlApi(`/categorias/${id}`))
      .pipe(map((r) => ({ categoria: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: CategoriaFormPayload): Observable<Categoria> {
    return this.http.post<{ data: Categoria }>(urlApi(`/categorias`), payload).pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: CategoriaFormPayload): Observable<Categoria> {
    return this.http.put<{ data: Categoria }>(urlApi(`/categorias/${id}`), payload).pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<Categoria> {
    return this.http
      .patch<{ data: Categoria }>(urlApi(`/categorias/${id}/desactivar`), {})
      .pipe(map((r) => r.data));
  }
}
