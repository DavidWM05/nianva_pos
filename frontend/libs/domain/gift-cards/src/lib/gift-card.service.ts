import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { ConsultaPagina, urlApi, opcionesIdempotencia } from '@nianva/core-http';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  EstadoGiftCard,
  GiftCard,
  GiftCardEmitirPayload,
} from './gift-card.types';

export type PagoRecarga = CuerpoDe<'/gift-cards/{giftCard}/recargar', 'post'>['pagos'][number];

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
    evento: ConsultaPagina,
    filtros: {
      clienteId?: string | null;
      estado?: EstadoGiftCard | null;
      codigo?: string;
    } = {},
  ): Observable<GiftCardsPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
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
      .get<RespuestaDe<'/gift-cards', 'get'>>(urlApi(`/gift-cards`), { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total })));
  }

  obtener(id: string): Observable<GiftCard> {
    return this.http
      .get<RespuestaDe<'/gift-cards/{giftCard}', 'get'>>(
        urlApi(`/gift-cards/${id}`),
      )
      .pipe(map((r) => r.data));
  }

  emitir(payload: GiftCardEmitirPayload, llaveIdempotencia?: string): Observable<GiftCard> {
    const cuerpo: CuerpoDe<'/gift-cards', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/gift-cards', 'post'>>(urlApi(`/gift-cards`), cuerpo, opcionesIdempotencia(llaveIdempotencia))
      .pipe(map((r) => r.data));
  }

  recargar(id: string, monto: number, pagos: PagoRecarga[], llaveIdempotencia?: string): Observable<GiftCard> {
    const cuerpo: CuerpoDe<'/gift-cards/{giftCard}/recargar', 'post'> = { monto, pagos };

    return this.http
      .post<RespuestaDe<'/gift-cards/{giftCard}/recargar', 'post'>>(
        urlApi(`/gift-cards/${id}/recargar`),
        cuerpo,
        opcionesIdempotencia(llaveIdempotencia),
      )
      .pipe(map((r) => r.data));
  }

  cancelar(id: string, llaveIdempotencia?: string): Observable<void> {
    return this.http
      .post<RespuestaDe<'/gift-cards/{giftCard}/cancelar', 'post'>>(
        urlApi(`/gift-cards/${id}/cancelar`),
        {},
        opcionesIdempotencia(llaveIdempotencia),
      )
      .pipe(map(() => undefined));
  }
}
