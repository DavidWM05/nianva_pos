import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
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
      .get<RespuestaDe<'/apartados', 'get'>>(urlApi(`/apartados`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data as Apartado[], total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<{ apartado: Apartado; permisos: ApartadoDetallePermisos }> {
    return this.http
      .get<RespuestaDe<'/apartados/{apartado}', 'get'>>(urlApi(`/apartados/${id}`))
      .pipe(map((r) => ({ apartado: r.data as Apartado, permisos: r.meta.permisos })));
  }

  crear(payload: ApartadoFormPayload): Observable<Apartado> {
    const cuerpo: CuerpoDe<'/apartados', 'post'> = payload;
    return this.http.post<RespuestaDe<'/apartados', 'post'>>(urlApi(`/apartados`), cuerpo).pipe(map((r) => r.data as Apartado));
  }

  registrarAbono(id: number, payload: AbonoFormPayload): Observable<Apartado> {
    const cuerpo: CuerpoDe<'/apartados/{apartado}/abonos', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/apartados/{apartado}/abonos', 'post'>>(urlApi(`/apartados/${id}/abonos`), cuerpo)
      .pipe(map((r) => r.data as Apartado));
  }

  liquidar(id: number): Observable<Apartado> {
    return this.http.patch<RespuestaDe<'/apartados/{apartado}/liquidar', 'patch'>>(urlApi(`/apartados/${id}/liquidar`), {}).pipe(map((r) => r.data as Apartado));
  }

  cancelar(id: number, motivo: string): Observable<ResultadoCancelacion> {
    const cuerpo: CuerpoDe<'/apartados/{apartado}/cancelar', 'patch'> = { motivo };
    return this.http
      .patch<RespuestaDe<'/apartados/{apartado}/cancelar', 'patch'>>(
        urlApi(`/apartados/${id}/cancelar`),
        cuerpo,
      )
      .pipe(
        map((r) => ({
          apartado: r.data as Apartado,
          tieneAbonosPendientes: r.meta.tiene_abonos_pendientes,
          montoAbonadoPendiente: r.meta.monto_abonado_pendiente,
        })),
      );
  }
}
