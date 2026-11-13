import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  EstadoOrdenProduccion,
  OrdenProduccion,
  OrdenProduccionCrearPayload,
} from './orden.types';

export interface OrdenesPermisos {
  completar?: boolean;
  crear: boolean;
}

export interface OrdenesPagina {
  data: OrdenProduccion[];
  total: number;
  permisos: OrdenesPermisos;
}

/**
 * Sin ordenesShow() -- solo index()/store()/cambiarEstado(). ordenesIndex()
 * devuelve modelos crudos (sin Resource, ver orden.types.ts).
 */
@Injectable({ providedIn: 'root' })
export class OrdenProduccionService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent): Observable<OrdenesPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<RespuestaDe<'/ordenes-produccion', 'get'>>(
        urlApi(`/ordenes-produccion`),
        { params },
      )
      .pipe(
        map((r) => ({
          data: r.data as OrdenProduccion[],
          total: r.meta.total,
          permisos: { ...r.meta.permisos, crear: r.meta.permisos['crear'] },
        })),
      );
  }

  crear(payload: OrdenProduccionCrearPayload): Observable<OrdenProduccion> {
    return this.http
      .post<RespuestaDe<'/ordenes-produccion', 'post'>>(
        urlApi(`/ordenes-produccion`),
        payload satisfies CuerpoDe<'/ordenes-produccion', 'post'>,
      )
      .pipe(map((r) => r.data as OrdenProduccion));
  }

  /**
   * PATCH .../estado: si estado='completada' descuenta insumos y devuelve
   * {data: OrdenProduccion}; en cualquier otro estado solo devuelve
   * {message}. La UI no depende del cuerpo de la respuesta -- siempre
   * vuelve a pedir la lista despues de esto.
   */
  cambiarEstado(
    id: number,
    estado: EstadoOrdenProduccion,
    cantidadProducida?: number,
  ): Observable<void> {
    return this.http
      .patch<RespuestaDe<'/ordenes-produccion/{id}/estado', 'patch'>>(
        urlApi(`/ordenes-produccion/${id}/estado`),
        {
          estado,
          ...(cantidadProducida !== undefined
            ? { cantidad_producida: cantidadProducida }
            : {}),
        } satisfies CuerpoDe<'/ordenes-produccion/{id}/estado', 'patch'>,
      )
      .pipe(map(() => undefined));
  }
}
