import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
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
      .get<RespuestaDe<'/ventas', 'get'>>(urlApi(`/ventas`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data as Venta[], total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<Venta> {
    return this.http.get<RespuestaDe<'/ventas/{venta}', 'get'>>(urlApi(`/ventas/${id}`)).pipe(map((r) => r.data as Venta));
  }

  registrar(payload: VentaFormPayload): Observable<Venta> {
    const cuerpo: CuerpoDe<'/ventas', 'post'> = payload;

    return this.http.post<RespuestaDe<'/ventas', 'post'>>(urlApi(`/ventas`), cuerpo).pipe(map((r) => r.data as Venta));
  }

  anular(id: number, motivo: string): Observable<Venta> {
    const cuerpo: CuerpoDe<'/ventas/{venta}/anular', 'patch'> = { motivo };

    return this.http
      .patch<RespuestaDe<'/ventas/{venta}/anular', 'patch'>>(urlApi(`/ventas/${id}/anular`), cuerpo)
      .pipe(map((r) => r.data as Venta));
  }

  /**
   * Precio siempre resuelto por el backend (PrecioService), nunca
   * calculado en el frontend -- se llama cada vez que la pantalla de
   * venta agrega o cambia la cantidad de una linea.
   */
  cotizar(items: VentaItemPayload[]): Observable<VentaCotizacion> {
    const cuerpo: CuerpoDe<'/ventas/cotizar', 'post'> = { items };

    return this.http
      .post<RespuestaDe<'/ventas/cotizar', 'post'>>(urlApi(`/ventas/cotizar`), cuerpo)
      // El contrato trae cantidad como string (decimal del backend): se convierte, sin cast doble.
      .pipe(
        map(({ data }): VentaCotizacion => ({
          items: data.items.map((item) => ({ ...item, cantidad: Number(item.cantidad) })),
          subtotal: data.subtotal,
        })),
      );
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
      .get<RespuestaDe<'/ventas/reporte', 'get'>>(urlApi(`/ventas/reporte`), { params })
      .pipe(map((r) => r.data as ReporteVentas));
  }
}
