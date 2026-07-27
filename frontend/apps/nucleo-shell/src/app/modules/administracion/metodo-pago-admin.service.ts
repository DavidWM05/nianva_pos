import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { MetodoPagoAdmin, MetodosPagoPagina, MetodosPagoPermisos, TipoMetodoPago } from './metodo-pago.types';

export interface MetodoPagoFormPayload {
  nombre: string;
  tipo: TipoMetodoPago;
  incluir_en_financiero: boolean;
}

/**
 * CRUD de administracion sobre el mismo endpoint /api/metodos-pago que ya
 * usa MetodoPagoService (TPV) para el selector simple de la venta -- ver
 * el reporte de Fase C. Nombrado *Admin para no chocar con ese servicio.
 */
@Injectable({ providedIn: 'root' })
export class MetodoPagoAdminService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, busqueda: string): Observable<MetodosPagoPagina> {
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
      .get<{ data: MetodoPagoAdmin[]; meta: { total: number; permisos: MetodosPagoPermisos } }>(
        `${API_BASE_URL}/api/metodos-pago`,
        { params },
      )
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<{ metodoPago: MetodoPagoAdmin; permisos: MetodosPagoPermisos }> {
    return this.http
      .get<{ data: MetodoPagoAdmin; meta: { permisos: MetodosPagoPermisos } }>(`${API_BASE_URL}/api/metodos-pago/${id}`)
      .pipe(map((r) => ({ metodoPago: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: MetodoPagoFormPayload): Observable<MetodoPagoAdmin> {
    return this.http.post<{ data: MetodoPagoAdmin }>(`${API_BASE_URL}/api/metodos-pago`, payload).pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: MetodoPagoFormPayload): Observable<MetodoPagoAdmin> {
    return this.http
      .put<{ data: MetodoPagoAdmin }>(`${API_BASE_URL}/api/metodos-pago/${id}`, payload)
      .pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<MetodoPagoAdmin> {
    return this.http
      .patch<{ data: MetodoPagoAdmin }>(`${API_BASE_URL}/api/metodos-pago/${id}/desactivar`, {})
      .pipe(map((r) => r.data));
  }
}
