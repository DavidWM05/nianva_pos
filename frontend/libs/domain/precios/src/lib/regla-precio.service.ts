import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { ConsultaPagina, urlApi } from '@nianva/core-http';
import { Observable, map } from 'rxjs';

import {
  AplicaA,
  ReglaPrecio,
  ReglasPrecioPagina,
  ReglasPrecioPermisos,
  TipoReglaPrecio,
} from './regla-precio.types';

export interface ReglaPrecioFormPayload {
  prioridad?: number;
  combinable?: boolean;
  nombre: string;
  tipo: TipoReglaPrecio;
  porcentaje?: CuerpoDe<'/reglas-precio', 'post'>['porcentaje'];
  monto?: CuerpoDe<'/reglas-precio', 'post'>['monto'];
  cantidad_compra?: number | null;
  cantidad_paga?: number | null;
  precio_bundle?: number | null;
  aplica_a: AplicaA;
  categoria_id?: number | null;
  producto_id?: number | null;
  variante_id?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReglaPrecioService {
  private readonly http = inject(HttpClient);

  /** Mismo contrato que ClienteService/ProductoService.listar(). */
  listar(
    evento: ConsultaPagina,
    busqueda: string,
  ): Observable<ReglasPrecioPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);
    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (busqueda.trim()) {
      params = params.set('filtro_nombre', busqueda.trim());
    }

    return this.http
      .get<RespuestaDe<'/reglas-precio', 'get'>>(urlApi(`/reglas-precio`), {
        params,
      })
      .pipe(
        map((r) => ({
          data: r.data,
          total: r.meta.total,
          permisos: r.meta.permisos,
        })),
      );
  }

  /** Mismo contrato que ClienteService/ProductoService.obtener(). */
  obtener(
    id: number,
  ): Observable<{ regla: ReglaPrecio; permisos: ReglasPrecioPermisos }> {
    return this.http
      .get<RespuestaDe<'/reglas-precio/{regla}', 'get'>>(
        urlApi(`/reglas-precio/${id}`),
      )
      .pipe(
        map((r) => ({
          regla: r.data,
          permisos: r.meta.permisos,
        })),
      );
  }

  crear(payload: ReglaPrecioFormPayload): Observable<ReglaPrecio> {
    const cuerpo: CuerpoDe<'/reglas-precio', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/reglas-precio', 'post'>>(
        urlApi(`/reglas-precio`),
        cuerpo,
      )
      .pipe(map((r) => r.data));
  }

  actualizar(
    id: number,
    payload: ReglaPrecioFormPayload,
  ): Observable<ReglaPrecio> {
    const cuerpo: CuerpoDe<'/reglas-precio/{regla}', 'put'> = payload;

    return this.http
      .put<RespuestaDe<'/reglas-precio/{regla}', 'put'>>(
        urlApi(`/reglas-precio/${id}`),
        cuerpo,
      )
      .pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<ReglaPrecio> {
    return this.http
      .patch<RespuestaDe<'/reglas-precio/{regla}/desactivar', 'patch'>>(
        urlApi(`/reglas-precio/${id}/desactivar`),
        {},
      )
      .pipe(map((r) => r.data));
  }
}
