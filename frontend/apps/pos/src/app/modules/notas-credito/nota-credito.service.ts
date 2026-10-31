import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { NotaCredito } from './nota-credito.types';

export interface NotasCreditoPagina {
  data: NotaCredito[];
  total: number;
}

/**
 * NotaCreditoController (backend) es de solo lectura: las notas de credito
 * se crean unicamente como efecto de una Devolucion con tipo_reembolso =
 * 'nota_credito' (ver DevolucionService), y se consumen unicamente dentro
 * de VentaController::store() via nota_credito_id. No existe store()/
 * update()/destroy() en el controller ni rutas para ellos -- por eso este
 * servicio solo expone lectura.
 */
@Injectable({ providedIn: 'root' })
export class NotaCreditoService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, filtros: { clienteId?: number | null } = {}): Observable<NotasCreditoPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (filtros.clienteId) {
      params = params.set('filtro_cliente_id', filtros.clienteId);
    }

    return this.http
      .get<{ data: NotaCredito[]; meta: { total: number } }>(urlApi(`/notas-credito`), { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total })));
  }

  obtener(id: number): Observable<NotaCredito> {
    return this.http.get<{ data: NotaCredito }>(urlApi(`/notas-credito/${id}`)).pipe(map((r) => r.data));
  }

  activasPorCliente(clienteId: number): Observable<NotaCredito[]> {
    return this.http
      .get<{ data: NotaCredito[] }>(urlApi(`/clientes/${clienteId}/notas-credito`))
      .pipe(map((r) => r.data));
  }
}
