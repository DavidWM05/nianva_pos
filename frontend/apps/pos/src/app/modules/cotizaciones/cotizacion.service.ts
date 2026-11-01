import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { Cotizacion, CotizacionCrearPayload, CotizacionFormPayload } from './cotizacion.types';

export interface CotizacionesPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  precio_manual?: boolean;
}

export interface CotizacionesPagina {
  data: Cotizacion[];
  total: number;
  permisos: CotizacionesPermisos;
}

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, filtros: { numero?: string; estado?: string; clienteId?: number } = {}): Observable<CotizacionesPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (filtros.numero?.trim()) {
      params = params.set('filtro_numero_cotizacion', filtros.numero.trim());
    }
    if (filtros.estado) {
      params = params.set('filtro_estado', filtros.estado);
    }
    if (filtros.clienteId) {
      params = params.set('filtro_cliente_id', filtros.clienteId);
    }

    return this.http
      .get<{ data: Cotizacion[]; meta: { total: number; permisos: CotizacionesPermisos } }>(urlApi(`/cotizaciones`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  permisos(): Observable<CotizacionesPermisos> {
    return this.http
      .get<{ meta: { permisos: CotizacionesPermisos } }>(urlApi('/cotizaciones'), {
        params: new HttpParams().set('rows', 1),
      })
      .pipe(map((r) => r.meta.permisos));
  }
  obtener(id: number): Observable<Cotizacion> {
    return this.http.get<{ data: Cotizacion }>(urlApi(`/cotizaciones/${id}`)).pipe(map((r) => r.data));
  }

  crear(payload: CotizacionCrearPayload): Observable<Cotizacion> {
    return this.http
      .post<{ data: Cotizacion }>(urlApi(`/cotizaciones`), payload)
      .pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: CotizacionFormPayload): Observable<Cotizacion> {
    return this.http
      .put<{ data: Cotizacion }>(urlApi(`/cotizaciones/${id}`), payload)
      .pipe(map((r) => r.data));
  }

  anular(id: number): Observable<void> {
    return this.http.delete<void>(urlApi(`/cotizaciones/${id}`));
  }

  /**
   * CotizacionService::convertirAVenta() (backend) solo acepta un unico
   * `metodo_pago_id` por el total completo -- no hay pago mixto ni
   * monto_recibido/cambio (el docblock del metodo los menciona pero el
   * codigo nunca los lee). No inventar ese campo aqui.
   */
  convertir(id: number, metodoPagoId: number): Observable<{ ventaId: number }> {
    return this.http
      .post<{ venta_id: number }>(urlApi(`/cotizaciones/${id}/convertir`), { metodo_pago_id: metodoPagoId })
      .pipe(map((r) => ({ ventaId: r.venta_id })));
  }
}
