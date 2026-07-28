import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { Prestamo, PrestamoCrearPayload, RegistrarPagoPrestamoPayload } from './prestamo.types';

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
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<{ data: Prestamo[]; meta: { total: number } }>(`${API_BASE_URL}/api/prestamos`, { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total })));
  }

  obtener(id: number): Observable<Prestamo> {
    return this.http.get<{ data: Prestamo }>(`${API_BASE_URL}/api/prestamos/${id}`).pipe(map((r) => r.data));
  }

  crear(payload: PrestamoCrearPayload): Observable<Prestamo> {
    return this.http.post<{ data: Prestamo }>(`${API_BASE_URL}/api/prestamos`, payload).pipe(map((r) => r.data));
  }

  /**
   * PrestamoController::registrarPago() devuelve solo el pago crudo (sin
   * envolver en Resource, sin el saldo/estado actualizado del prestamo a
   * diferencia de CuentaCobrarController/CuentaPagarController) -- por eso
   * el observable es `void`: quien llama debe volver a pedir listar().
   */
  registrarPago(id: number, payload: RegistrarPagoPrestamoPayload): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/api/prestamos/${id}/pagos`, payload).pipe(map(() => undefined));
  }
}
