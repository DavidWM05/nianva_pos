import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { ReporteVentas, ReporteVentasFiltros, Venta, VentaCotizacion, VentaFormPayload, VentaItemPayload, VentasPagina } from './venta.types';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);

  /** Mismo contrato que ClienteService/ProductoService.listar(). */
  listar(evento: DataTableLazyEvent, busqueda: string): Observable<VentasPagina> {
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
      .get<{ data: Venta[]; meta: { total: number; permisos: VentasPagina['permisos'] } }>(urlApi(`/ventas`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<Venta> {
    return this.http.get<{ data: Venta }>(urlApi(`/ventas/${id}`)).pipe(map((r) => r.data));
  }

  registrar(payload: VentaFormPayload): Observable<Venta> {
    return this.http.post<{ data: Venta }>(urlApi(`/ventas`), payload).pipe(map((r) => r.data));
  }

  anular(id: number, motivo: string): Observable<Venta> {
    return this.http
      .patch<{ data: Venta }>(urlApi(`/ventas/${id}/anular`), { motivo })
      .pipe(map((r) => r.data));
  }

  /**
   * Precio siempre resuelto por el backend (PrecioService), nunca
   * calculado en el frontend -- se llama cada vez que la pantalla de
   * venta agrega o cambia la cantidad de una linea.
   */
  cotizar(items: VentaItemPayload[]): Observable<VentaCotizacion> {
    return this.http
      .post<{ data: VentaCotizacion }>(urlApi(`/ventas/cotizar`), { items })
      .pipe(map((r) => r.data));
  }

  /** Sin filtros: backend usa el mes actual (dia 1 a hoy) y todas las sucursales del tenant. */
  reporte(filtros: ReporteVentasFiltros = {}): Observable<ReporteVentas> {
    let params = new HttpParams();

    if (filtros.fechaDesde) {
      params = params.set('fecha_desde', filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      params = params.set('fecha_hasta', filtros.fechaHasta);
    }
    if (filtros.sucursalId) {
      params = params.set('sucursal_id', filtros.sucursalId);
    }

    return this.http
      .get<{ data: ReporteVentas }>(urlApi(`/ventas/reporte`), { params })
      .pipe(map((r) => r.data));
  }
}
