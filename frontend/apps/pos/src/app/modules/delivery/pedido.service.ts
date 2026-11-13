import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { CODIGOS_EN_PANTALLA } from '../../core/errores.interceptor';
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
  // La pantalla muestra su propio mensaje para `sucursal_requerida` (ARQ-12); el resto, el interceptor.
  private readonly sucursalEnPantalla = new HttpContext().set(
    CODIGOS_EN_PANTALLA,
    ['sucursal_requerida'],
  );

  listar(
    evento: DataTableLazyEvent,
    filtros: {
      numeroPedido?: string;
      estado?: EstadoPedido | null;
      clienteId?: number | null;
      repartidorId?: number | null;
    } = {},
  ): Observable<PedidosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
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
      .get<RespuestaDe<'/pedidos', 'get'>>(urlApi(`/pedidos`), { params })
      .pipe(
        map((r) => ({
          data: r.data as Pedido[],
          total: r.meta.total,
          permisos: { ...r.meta.permisos, crear: r.meta.permisos['crear'] },
        })),
      );
  }

  obtener(id: number): Observable<Pedido> {
    return this.http
      .get<RespuestaDe<'/pedidos/{pedido}', 'get'>>(urlApi(`/pedidos/${id}`))
      .pipe(map((r) => r.data as Pedido));
  }

  crear(payload: PedidoCrearPayload): Observable<Pedido> {
    return this.http
      .post<RespuestaDe<'/pedidos', 'post'>>(
        urlApi(`/pedidos`),
        payload satisfies CuerpoDe<'/pedidos', 'post'>,
        { context: this.sucursalEnPantalla },
      )
      .pipe(map((r) => r.data as Pedido));
  }

  cambiarEstado(id: number, estado: EstadoPedido): Observable<Pedido> {
    return this.http
      .patch<RespuestaDe<'/pedidos/{id}/estado', 'patch'>>(
        urlApi(`/pedidos/${id}/estado`),
        { estado } satisfies CuerpoDe<'/pedidos/{id}/estado', 'patch'>,
      )
      .pipe(map((r) => r.data as Pedido));
  }

  asignarRepartidor(id: number, repartidorId: number): Observable<Pedido> {
    return this.http
      .patch<RespuestaDe<'/pedidos/{id}/repartidor', 'patch'>>(
        urlApi(`/pedidos/${id}/repartidor`),
        { repartidor_id: repartidorId } satisfies CuerpoDe<
          '/pedidos/{id}/repartidor',
          'patch'
        >,
      )
      .pipe(map((r) => r.data as Pedido));
  }
}
