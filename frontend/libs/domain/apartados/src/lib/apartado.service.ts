import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { ConsultaPagina, urlApi, opcionesIdempotencia, opcionesOperacionSupervisada } from '@nianva/core-http';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

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
  listar(evento: ConsultaPagina, busqueda: string): Observable<ApartadosPagina> {
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
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: string): Observable<{ apartado: Apartado; permisos: ApartadoDetallePermisos }> {
    return this.http
      .get<RespuestaDe<'/apartados/{apartado}', 'get'>>(urlApi(`/apartados/${id}`))
      .pipe(map((r) => ({ apartado: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: ApartadoFormPayload, llaveIdempotencia?: string): Observable<Apartado> {
    const cuerpo: CuerpoDe<'/apartados', 'post'> = payload;
    return this.http.post<RespuestaDe<'/apartados', 'post'>>(urlApi(`/apartados`), cuerpo, opcionesIdempotencia(llaveIdempotencia)).pipe(map((r) => r.data));
  }

  registrarAbono(id: string, payload: AbonoFormPayload, llaveIdempotencia?: string): Observable<Apartado> {
    const cuerpo: CuerpoDe<'/apartados/{apartado}/abonos', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/apartados/{apartado}/abonos', 'post'>>(urlApi(`/apartados/${id}/abonos`), cuerpo, opcionesIdempotencia(llaveIdempotencia))
      .pipe(map((r) => r.data));
  }

  liquidar(id: string, llaveIdempotencia?: string): Observable<Apartado> {
    return this.http.patch<RespuestaDe<'/apartados/{apartado}/liquidar', 'patch'>>(urlApi(`/apartados/${id}/liquidar`), {}, opcionesIdempotencia(llaveIdempotencia)).pipe(map((r) => r.data));
  }

  cancelar(id: string, motivo: string, llaveIdempotencia?: string, tokenSupervisor?: string): Observable<ResultadoCancelacion> {
    const cuerpo: CuerpoDe<'/apartados/{apartado}/cancelar', 'patch'> = { motivo };
    return this.http
      .patch<RespuestaDe<'/apartados/{apartado}/cancelar', 'patch'>>(
        urlApi(`/apartados/${id}/cancelar`),
        cuerpo,
        opcionesOperacionSupervisada(llaveIdempotencia, tokenSupervisor),
      )
      .pipe(
        map((r) => ({
          apartado: r.data,
          tieneAbonosPendientes: r.meta.tiene_abonos_pendientes,
          montoAbonadoPendiente: r.meta.monto_abonado_pendiente,
        })),
      );
  }

  impresoAbono(apartado: string, abono: string): Observable<RespuestaDe<'/apartados/{apartado}/abonos/{abono}/impreso', 'get'>['data']> {
    return this.http.get<RespuestaDe<'/apartados/{apartado}/abonos/{abono}/impreso', 'get'>>(urlApi(`/apartados/${apartado}/abonos/${abono}/impreso`))
      .pipe(map((respuesta) => respuesta.data));
  }
}
