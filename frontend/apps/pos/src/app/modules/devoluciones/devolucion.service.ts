import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
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
      .get<RespuestaDe<'/devoluciones', 'get'>>(
        urlApi(`/devoluciones`),
        { params },
      )
      .pipe(map((r) => ({ data: r.data as Devolucion[], total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<Devolucion> {
    return this.http.get<RespuestaDe<'/devoluciones/{devolucion}', 'get'>>(urlApi(`/devoluciones/${id}`)).pipe(map((r) => r.data as Devolucion));
  }

  registrar(payload: DevolucionFormPayload): Observable<{ devolucion: Devolucion; notaCredito: DevolucionNotaCreditoInfo | null }> {
    const cuerpo: CuerpoDe<'/devoluciones', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/devoluciones', 'post'>>(urlApi(`/devoluciones`), cuerpo)
      .pipe(map((r) => ({ devolucion: r.data as Devolucion, notaCredito: r.nota_credito })));
  }
}
