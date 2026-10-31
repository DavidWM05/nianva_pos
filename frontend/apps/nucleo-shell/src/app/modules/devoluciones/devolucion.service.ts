import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { Devolucion, DevolucionFormPayload, DevolucionNotaCreditoInfo, DevolucionesPagina } from './devolucion.types';

@Injectable({ providedIn: 'root' })
export class DevolucionService {
  private readonly http = inject(HttpClient);

  /** Mismo contrato que VentaService/ApartadoService.listar(). */
  listar(evento: DataTableLazyEvent): Observable<DevolucionesPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<{ data: Devolucion[]; meta: { total: number; permisos: DevolucionesPagina['permisos'] } }>(
        urlApi(`/devoluciones`),
        { params },
      )
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<Devolucion> {
    return this.http.get<{ data: Devolucion }>(urlApi(`/devoluciones/${id}`)).pipe(map((r) => r.data));
  }

  registrar(payload: DevolucionFormPayload): Observable<{ devolucion: Devolucion; notaCredito: DevolucionNotaCreditoInfo | null }> {
    return this.http
      .post<{ data: Devolucion; nota_credito: DevolucionNotaCreditoInfo | null }>(urlApi(`/devoluciones`), payload)
      .pipe(map((r) => ({ devolucion: r.data, notaCredito: r.nota_credito })));
  }
}
