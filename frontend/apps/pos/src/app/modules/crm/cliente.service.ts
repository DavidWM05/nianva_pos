import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  Cliente,
  ClientesPagina,
  ClientesPermisos,
  VentaResumen,
} from './cliente.types';

export interface ClienteFormPayload {
  nombre: string;
  documento_fiscal?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);

  /**
   * Traduce DataTableLazyEvent (paginacion/orden de nucleo-data-table) al
   * contrato de ClienteController::index() -- page/rows/sort_field/
   * sort_order/filtro_<campo>. `busqueda` es un input propio de la lista
   * (no del DataTableComponent, ver la decision de diseno en el reporte),
   * se manda como filtro por nombre.
   */
  listar(
    evento: DataTableLazyEvent,
    busqueda: string,
  ): Observable<ClientesPagina> {
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
      .get<RespuestaDe<'/clientes', 'get'>>(urlApi(`/clientes`), { params })
      .pipe(
        map((respuesta) => ({
          data: respuesta.data as Cliente[],
          total: respuesta.meta.total,
          permisos: respuesta.meta.permisos,
        })),
      );
  }

  obtener(
    id: number,
  ): Observable<{
    cliente: Cliente;
    permisos: Omit<ClientesPermisos, 'crear'>;
  }> {
    return this.http
      .get<RespuestaDe<'/clientes/{cliente}', 'get'>>(urlApi(`/clientes/${id}`))
      .pipe(
        map((r) => ({ cliente: r.data as Cliente, permisos: r.meta.permisos })),
      );
  }

  crear(payload: ClienteFormPayload): Observable<Cliente> {
    const cuerpo: CuerpoDe<'/clientes', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/clientes', 'post'>>(urlApi(`/clientes`), cuerpo)
      .pipe(map((r) => r.data as Cliente));
  }

  actualizar(id: number, payload: ClienteFormPayload): Observable<Cliente> {
    const cuerpo: CuerpoDe<'/clientes/{cliente}', 'put'> = payload;

    return this.http
      .put<RespuestaDe<'/clientes/{cliente}', 'put'>>(
        urlApi(`/clientes/${id}`),
        cuerpo,
      )
      .pipe(map((r) => r.data as Cliente));
  }

  desactivar(id: number): Observable<Cliente> {
    return this.http
      .patch<RespuestaDe<'/clientes/{cliente}/desactivar', 'patch'>>(
        urlApi(`/clientes/${id}/desactivar`),
        {},
      )
      .pipe(map((r) => r.data as Cliente));
  }

  ventas(id: number): Observable<VentaResumen[]> {
    return this.http
      .get<RespuestaDe<'/clientes/{cliente}/ventas', 'get'>>(
        urlApi(`/clientes/${id}/ventas`),
      )
      .pipe(map((r) => r.data as VentaResumen[]));
  }
}
