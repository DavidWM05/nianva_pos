import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  AplicaA,
  ReglaPrecio,
  ReglasPrecioPagina,
  ReglasPrecioPermisos,
  TipoReglaPrecio,
} from './regla-precio.types';

export interface ReglaPrecioFormPayload {
  nombre: string;
  tipo: TipoReglaPrecio;
  valor?: number | null;
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
    evento: DataTableLazyEvent,
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
          data: r.data as ReglaPrecio[],
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
          regla: r.data as ReglaPrecio,
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
      .pipe(map((r) => r.data as ReglaPrecio));
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
      .pipe(map((r) => r.data as ReglaPrecio));
  }

  desactivar(id: number): Observable<ReglaPrecio> {
    return this.http
      .patch<RespuestaDe<'/reglas-precio/{regla}/desactivar', 'patch'>>(
        urlApi(`/reglas-precio/${id}/desactivar`),
        {},
      )
      .pipe(map((r) => r.data as ReglaPrecio));
  }
}
