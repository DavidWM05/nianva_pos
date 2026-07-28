import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { EstadoGiftCard, GiftCard, GiftCardEmitirPayload } from './gift-card.types';

export interface GiftCardsPagina {
  data: GiftCard[];
  total: number;
}

/**
 * GiftCardController::permisosDe() (backend) devuelve {crear, editar,
 * eliminar} pero el catalogo real de permisos de este modulo es
 * {ver, emitir, recargar, cancelar} (ver NucleoRolesPermisosSeeder) --
 * `gift_cards.crear/editar/eliminar` no existen como permiso sembrado, asi
 * que `meta.permisos.crear` da `false` SIEMPRE, incluso para admin. No se
 * usa ese campo para ocultar el boton de emitir/recargar/cancelar --
 * se muestran siempre y el 403 real del backend se ve como toast (mismo
 * criterio ya aplicado en Cotizaciones/Cliente).
 */
@Injectable({ providedIn: 'root' })
export class GiftCardService {
  private readonly http = inject(HttpClient);

  listar(
    evento: DataTableLazyEvent,
    filtros: { clienteId?: number | null; estado?: EstadoGiftCard | null; codigo?: string } = {},
  ): Observable<GiftCardsPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (filtros.clienteId) {
      params = params.set('filtro_cliente_id', filtros.clienteId);
    }
    if (filtros.estado) {
      params = params.set('filtro_estado', filtros.estado);
    }
    if (filtros.codigo?.trim()) {
      params = params.set('filtro_codigo', filtros.codigo.trim());
    }

    return this.http
      .get<{ data: GiftCard[]; meta: { total: number } }>(`${API_BASE_URL}/api/gift-cards`, { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total })));
  }

  obtener(id: number): Observable<GiftCard> {
    return this.http.get<{ data: GiftCard }>(`${API_BASE_URL}/api/gift-cards/${id}`).pipe(map((r) => r.data));
  }

  emitir(payload: GiftCardEmitirPayload): Observable<GiftCard> {
    return this.http.post<{ data: GiftCard }>(`${API_BASE_URL}/api/gift-cards`, payload).pipe(map((r) => r.data));
  }

  recargar(id: number, monto: number): Observable<GiftCard> {
    return this.http
      .post<{ data: GiftCard }>(`${API_BASE_URL}/api/gift-cards/${id}/recargar`, { monto })
      .pipe(map((r) => r.data));
  }

  cancelar(id: number): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/api/gift-cards/${id}/cancelar`, {});
  }
}
