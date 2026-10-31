import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  AbonoFormPayload,
  Apartado,
  ApartadoDetallePermisos,
  ApartadoFormPayload,
  ApartadosPagina,
  ResultadoCancelacion,
} from './apartado.types';

@Injectable({ providedIn: 'root' })
export class ApartadoService {
  private readonly http = inject(HttpClient);

  /** Mismo contrato que ClienteService/VentaService.listar(). */
  listar(evento: DataTableLazyEvent, busqueda: string): Observable<ApartadosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (busqueda.trim()) {
      params = params.set('filtro_cliente', busqueda.trim());
    }

    return this.http
      .get<{ data: Apartado[]; meta: { total: number; permisos: ApartadosPagina['permisos'] } }>(urlApi(`/apartados`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<{ apartado: Apartado; permisos: ApartadoDetallePermisos }> {
    return this.http
      .get<{ data: Apartado; meta: { permisos: ApartadoDetallePermisos } }>(urlApi(`/apartados/${id}`))
      .pipe(map((r) => ({ apartado: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: ApartadoFormPayload): Observable<Apartado> {
    return this.http.post<{ data: Apartado }>(urlApi(`/apartados`), payload).pipe(map((r) => r.data));
  }

  registrarAbono(id: number, payload: AbonoFormPayload): Observable<Apartado> {
    return this.http
      .post<{ data: Apartado }>(urlApi(`/apartados/${id}/abonos`), payload)
      .pipe(map((r) => r.data));
  }

  liquidar(id: number): Observable<Apartado> {
    return this.http.patch<{ data: Apartado }>(urlApi(`/apartados/${id}/liquidar`), {}).pipe(map((r) => r.data));
  }

  cancelar(id: number, motivo: string): Observable<ResultadoCancelacion> {
    return this.http
      .patch<{ data: Apartado; meta: { tiene_abonos_pendientes: boolean; monto_abonado_pendiente: number } }>(
        urlApi(`/apartados/${id}/cancelar`),
        { motivo },
      )
      .pipe(
        map((r) => ({
          apartado: r.data,
          tieneAbonosPendientes: r.meta.tiene_abonos_pendientes,
          montoAbonadoPendiente: r.meta.monto_abonado_pendiente,
        })),
      );
  }
}
