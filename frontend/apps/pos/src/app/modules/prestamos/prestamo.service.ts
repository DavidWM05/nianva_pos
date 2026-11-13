import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  Prestamo,
  PrestamoCrearPayload,
  RegistrarPagoPrestamoPayload,
} from './prestamo.types';

export interface PrestamosPagina {
  data: Prestamo[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class PrestamoService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent): Observable<PrestamosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<RespuestaDe<'/prestamos', 'get'>>(urlApi(`/prestamos`), { params })
      .pipe(map((r) => ({ data: r.data as Prestamo[], total: r.meta.total })));
  }

  obtener(id: number): Observable<Prestamo> {
    return this.http
      .get<RespuestaDe<'/prestamos/{prestamo}', 'get'>>(
        urlApi(`/prestamos/${id}`),
      )
      .pipe(map((r) => r.data as Prestamo));
  }

  crear(payload: PrestamoCrearPayload): Observable<Prestamo> {
    return this.http
      .post<RespuestaDe<'/prestamos', 'post'>>(
        urlApi(`/prestamos`),
        payload satisfies CuerpoDe<'/prestamos', 'post'>,
      )
      .pipe(map((r) => r.data as Prestamo));
  }

  /**
   * PrestamoController::registrarPago() devuelve solo el pago crudo (sin
   * envolver en Resource, sin el saldo/estado actualizado del prestamo a
   * diferencia de CuentaCobrarController/CuentaPagarController) -- por eso
   * el observable es `void`: quien llama debe volver a pedir listar().
   */
  registrarPago(
    id: number,
    payload: RegistrarPagoPrestamoPayload,
  ): Observable<void> {
    return this.http
      .post<RespuestaDe<'/prestamos/{id}/pagos', 'post'>>(
        urlApi(`/prestamos/${id}/pagos`),
        payload satisfies CuerpoDe<'/prestamos/{id}/pagos', 'post'>,
      )
      .pipe(map(() => undefined));
  }
}
