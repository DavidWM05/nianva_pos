import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { AjustarPuntosPayload, CrmInteraccion, InteraccionFormPayload, LoyaltyResumen, LoyaltyTransaccion, ReporteCrm } from './crm-avanzado.types';

@Injectable({ providedIn: 'root' })
export class CrmAvanzadoService {
  private readonly http = inject(HttpClient);

  /** Sin paginacion: CrmAvanzadoController::interacciones() devuelve la lista completa, no un paginador. */
  interacciones(clienteId: number): Observable<CrmInteraccion[]> {
    return this.http
      .get<{ data: CrmInteraccion[] }>(urlApi(`/clientes/${clienteId}/interacciones`))
      .pipe(map((r) => r.data));
  }

  crearInteraccion(clienteId: number, payload: InteraccionFormPayload): Observable<CrmInteraccion> {
    return this.http
      .post<{ data: CrmInteraccion }>(urlApi(`/clientes/${clienteId}/interacciones`), payload)
      .pipe(map((r) => r.data));
  }

  loyalty(clienteId: number): Observable<LoyaltyResumen> {
    return this.http
      .get<{ data: LoyaltyResumen }>(urlApi(`/clientes/${clienteId}/loyalty`))
      .pipe(map((r) => r.data));
  }

  ajustarPuntos(clienteId: number, payload: AjustarPuntosPayload): Observable<LoyaltyTransaccion> {
    return this.http
      .post<{ data: LoyaltyTransaccion }>(urlApi(`/clientes/${clienteId}/loyalty/ajustar`), payload)
      .pipe(map((r) => r.data));
  }

  reporte(): Observable<ReporteCrm> {
    return this.http.get<{ data: ReporteCrm }>(urlApi(`/crm/reporte`)).pipe(map((r) => r.data));
  }
}
