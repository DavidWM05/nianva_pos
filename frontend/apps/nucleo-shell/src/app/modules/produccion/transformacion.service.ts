import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { TransformacionCrearPayload, TransformacionProducto } from './transformacion.types';

export interface TransformacionesPermisos {
  crear: boolean;
}

export interface TransformacionesPagina {
  data: TransformacionProducto[];
  total: number;
  permisos: TransformacionesPermisos;
}

/** Sin transformacionesShow() -- solo index()/store() (ajuste 9: GET /transformaciones ya existe). */
@Injectable({ providedIn: 'root' })
export class TransformacionService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent): Observable<TransformacionesPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<{ data: TransformacionProducto[]; meta: { total: number; permisos: TransformacionesPermisos } }>(urlApi(`/transformaciones`), { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  crear(payload: TransformacionCrearPayload): Observable<TransformacionProducto> {
    return this.http
      .post<{ data: TransformacionProducto }>(urlApi(`/transformaciones`), payload)
      .pipe(map((r) => r.data));
  }
}
