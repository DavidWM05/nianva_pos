import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { GenerarNominaPayload, Nomina } from './nomina.types';

export interface NominasPermisos {
  crear: boolean;
}

export interface NominasPagina {
  data: Nomina[];
  total: number;
  permisos: NominasPermisos;
}

@Injectable({ providedIn: 'root' })
export class NominaService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent): Observable<NominasPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<{ data: Nomina[]; meta: { total: number; permisos: NominasPermisos } }>(urlApi(`/nominas`), { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<Nomina> {
    return this.http.get<{ data: Nomina }>(urlApi(`/nominas/${id}`)).pipe(map((r) => r.data));
  }

  generar(payload: GenerarNominaPayload): Observable<Nomina> {
    return this.http.post<{ data: Nomina }>(urlApi(`/nominas/generar`), payload).pipe(map((r) => r.data));
  }

  pagar(id: number): Observable<Nomina> {
    return this.http.patch<{ data: Nomina }>(urlApi(`/nominas/${id}/pagar`), {}).pipe(map((r) => r.data));
  }
}
