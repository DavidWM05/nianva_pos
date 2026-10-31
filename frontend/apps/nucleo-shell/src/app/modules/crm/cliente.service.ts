import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { Cliente, ClientesPagina, ClientesPermisos, VentaResumen } from './cliente.types';

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
  listar(evento: DataTableLazyEvent, busqueda: string): Observable<ClientesPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (busqueda.trim()) {
      params = params.set('filtro_nombre', busqueda.trim());
    }

    return this.http
      .get<{ data: Cliente[]; meta: { total: number; permisos: ClientesPagina['permisos'] } }>(
        urlApi(`/clientes`),
        { params },
      )
      .pipe(map((respuesta) => ({ data: respuesta.data, total: respuesta.meta.total, permisos: respuesta.meta.permisos })));
  }

  obtener(id: number): Observable<{ cliente: Cliente; permisos: Omit<ClientesPermisos, 'crear'> }> {
    return this.http
      .get<{ data: Cliente; meta: { permisos: Omit<ClientesPermisos, 'crear'> } }>(urlApi(`/clientes/${id}`))
      .pipe(map((r) => ({ cliente: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: ClienteFormPayload): Observable<Cliente> {
    return this.http.post<{ data: Cliente }>(urlApi(`/clientes`), payload).pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: ClienteFormPayload): Observable<Cliente> {
    return this.http.put<{ data: Cliente }>(urlApi(`/clientes/${id}`), payload).pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<Cliente> {
    return this.http
      .patch<{ data: Cliente }>(urlApi(`/clientes/${id}/desactivar`), {})
      .pipe(map((r) => r.data));
  }

  ventas(id: number): Observable<VentaResumen[]> {
    return this.http.get<{ data: VentaResumen[] }>(urlApi(`/clientes/${id}/ventas`)).pipe(map((r) => r.data));
  }
}
