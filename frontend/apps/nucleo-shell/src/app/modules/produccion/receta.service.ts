import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { Receta, RecetaCrearPayload } from './receta.types';

export interface RecetasPermisos {
  crear: boolean;
}

export interface RecetasPagina {
  data: Receta[];
  total: number;
  permisos: RecetasPermisos;
}

/** Sin recetasShow()/recetasUpdate() -- solo index()/store(). */
@Injectable({ providedIn: 'root' })
export class RecetaService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent): Observable<RecetasPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<{ data: Receta[]; meta: { total: number; permisos: RecetasPermisos } }>(`${API_BASE_URL}/api/recetas`, { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  crear(payload: RecetaCrearPayload): Observable<Receta> {
    return this.http.post<{ data: Receta }>(`${API_BASE_URL}/api/recetas`, payload).pipe(map((r) => r.data));
  }
}
