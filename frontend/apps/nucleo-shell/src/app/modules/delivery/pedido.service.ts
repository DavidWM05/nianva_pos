import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { EstadoPedido, Pedido, PedidoCrearPayload } from './pedido.types';

export interface PedidosPermisos {
  crear: boolean;
}

export interface PedidosPagina {
  data: Pedido[];
  total: number;
  permisos: PedidosPermisos;
}

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);

  listar(
    evento: DataTableLazyEvent,
    filtros: { numeroPedido?: string; estado?: EstadoPedido | null; clienteId?: number | null; repartidorId?: number | null } = {},
  ): Observable<PedidosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (filtros.numeroPedido?.trim()) {
      params = params.set('filtro_numero_pedido', filtros.numeroPedido.trim());
    }
    if (filtros.estado) {
      params = params.set('filtro_estado', filtros.estado);
    }
    if (filtros.clienteId) {
      params = params.set('filtro_cliente_id', filtros.clienteId);
    }
    if (filtros.repartidorId) {
      params = params.set('filtro_repartidor_id', filtros.repartidorId);
    }

    return this.http
      .get<{ data: Pedido[]; meta: { total: number; permisos: PedidosPermisos } }>(`${API_BASE_URL}/api/pedidos`, { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<Pedido> {
    return this.http.get<{ data: Pedido }>(`${API_BASE_URL}/api/pedidos/${id}`).pipe(map((r) => r.data));
  }

  crear(payload: PedidoCrearPayload): Observable<Pedido> {
    return this.http.post<{ data: Pedido }>(`${API_BASE_URL}/api/pedidos`, payload).pipe(map((r) => r.data));
  }

  cambiarEstado(id: number, estado: EstadoPedido): Observable<Pedido> {
    return this.http
      .patch<{ data: Pedido }>(`${API_BASE_URL}/api/pedidos/${id}/estado`, { estado })
      .pipe(map((r) => r.data));
  }

  asignarRepartidor(id: number, repartidorId: number): Observable<Pedido> {
    return this.http
      .patch<{ data: Pedido }>(`${API_BASE_URL}/api/pedidos/${id}/repartidor`, { repartidor_id: repartidorId })
      .pipe(map((r) => r.data));
  }
}
