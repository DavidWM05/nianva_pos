import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
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
      .get<RespuestaDe<'/metodos-pago', 'get'>>(urlApi(`/metodos-pago`), { params })
      .pipe(
        map((r) => {
          const respuesta = r as { data: MetodoPagoAdmin[]; meta: { total: number; permisos: MetodosPagoPermisos } };
          return { data: respuesta.data, total: respuesta.meta.total, permisos: respuesta.meta.permisos };
        }),
      );
  }

  obtener(id: number): Observable<{ metodoPago: MetodoPagoAdmin; permisos: MetodosPagoPermisos }> {
    return this.http
      .get<RespuestaDe<'/metodos-pago/{metodoPago}', 'get'>>(urlApi(`/metodos-pago/${id}`))
      .pipe(map((r) => ({ metodoPago: r.data as MetodoPagoAdmin, permisos: r.meta.permisos as MetodosPagoPermisos })));
  }

  crear(payload: MetodoPagoFormPayload): Observable<MetodoPagoAdmin> {
    const cuerpo: CuerpoDe<'/metodos-pago', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/metodos-pago', 'post'>>(urlApi(`/metodos-pago`), cuerpo)
      .pipe(map((r) => r.data as MetodoPagoAdmin));
  }

  actualizar(id: number, payload: MetodoPagoFormPayload): Observable<MetodoPagoAdmin> {
    return this.http
      .put<RespuestaDe<'/metodos-pago/{metodoPago}', 'put'>>(urlApi(`/metodos-pago/${id}`), payload)
      .pipe(map((r) => r.data as MetodoPagoAdmin));
  }

  desactivar(id: number): Observable<MetodoPagoAdmin> {
    return this.http
      .patch<RespuestaDe<'/metodos-pago/{metodoPago}/desactivar', 'patch'>>(urlApi(`/metodos-pago/${id}/desactivar`), {})
      .pipe(map((r) => r.data as MetodoPagoAdmin));
  }
}
