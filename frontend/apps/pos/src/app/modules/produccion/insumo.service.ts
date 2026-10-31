import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { Insumo, InsumoCrearPayload } from './insumo.types';

export interface InsumosPermisos {
  crear: boolean;
}

export interface InsumosPagina {
  data: Insumo[];
  total: number;
  permisos: InsumosPermisos;
}

/**
 * Sin insumosShow()/insumosUpdate() -- solo index()/store(). La accion de
 * consultar stock (GET /insumos/{id}/stocks) existe en el backend pero
 * crashea hoy (falta el modelo InsumoStock, reportado a backend) -- no se
 * expone aqui hasta que este resuelto.
 */
@Injectable({ providedIn: 'root' })
export class InsumoService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, filtros: { nombre?: string; sku?: string; stockBajo?: boolean } = {}): Observable<InsumosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (filtros.nombre?.trim()) {
      params = params.set('filtro_nombre', filtros.nombre.trim());
    }
    if (filtros.sku?.trim()) {
      params = params.set('filtro_sku', filtros.sku.trim());
    }
    if (filtros.stockBajo) {
      params = params.set('stock_bajo', '1');
    }

    return this.http
      .get<{ data: Insumo[]; meta: { total: number; permisos: InsumosPermisos } }>(urlApi(`/insumos`), { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  crear(payload: InsumoCrearPayload): Observable<Insumo> {
    return this.http.post<{ data: Insumo }>(urlApi(`/insumos`), payload).pipe(map((r) => r.data));
  }
}
