import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { Cupon, CuponesPagina, CuponesPermisos } from './cupon.types';

export interface CuponFormPayload {
  codigo: string;
  nombre: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: number;
  uso_maximo?: number | null;
  uso_maximo_por_cliente?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CuponService {
  private readonly http = inject(HttpClient);

  listar(
    evento: DataTableLazyEvent,
    busqueda: string,
  ): Observable<CuponesPagina> {
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
      .get<RespuestaDe<'/cupones', 'get'>>(urlApi(`/cupones`), { params })
      .pipe(
        map((r) => ({
          data: r.data as Cupon[],
          total: r.meta.total,
          permisos: r.meta.permisos,
        })),
      );
  }

  /** Mismo contrato que ClienteService.obtener() -- permisos sin 'crear' (show() no lo necesita). */
  obtener(
    id: number,
  ): Observable<{ cupon: Cupon; permisos: Omit<CuponesPermisos, 'crear'> }> {
    return this.http
      .get<RespuestaDe<'/cupones/{cupon}', 'get'>>(urlApi(`/cupones/${id}`))
      .pipe(
        map((r) => ({ cupon: r.data as Cupon, permisos: r.meta.permisos })),
      );
  }

  crear(payload: CuponFormPayload): Observable<Cupon> {
    const cuerpo: CuerpoDe<'/cupones', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/cupones', 'post'>>(urlApi(`/cupones`), cuerpo)
      .pipe(map((r) => r.data as Cupon));
  }

  actualizar(id: number, payload: CuponFormPayload): Observable<Cupon> {
    const cuerpo: CuerpoDe<'/cupones/{cupon}', 'put'> = payload;

    return this.http
      .put<RespuestaDe<'/cupones/{cupon}', 'put'>>(
        urlApi(`/cupones/${id}`),
        cuerpo,
      )
      .pipe(map((r) => r.data as Cupon));
  }

  desactivar(id: number): Observable<Cupon> {
    return this.http
      .patch<RespuestaDe<'/cupones/{cupon}/desactivar', 'patch'>>(
        urlApi(`/cupones/${id}/desactivar`),
        {},
      )
      .pipe(map((r) => r.data as Cupon));
  }
}
