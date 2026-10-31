import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { Gasto } from './gasto.types';

/**
 * Sin pantalla propia -- vive dentro de la vista de caja (ver
 * CajaComponent). listar() siempre pide la sesion de caja puntual (la
 * que ya conoce CajaComponent via CajaService.actual()), nunca un
 * historial general.
 */
@Injectable({ providedIn: 'root' })
export class GastoService {
  private readonly http = inject(HttpClient);

  listar(cajaSesionId: number): Observable<Gasto[]> {
    return this.http
      .get<{ data: Gasto[] }>(urlApi(`/gastos`), { params: { caja_sesion_id: cajaSesionId } })
      .pipe(map((r) => r.data));
  }

  registrar(descripcion: string, monto: number): Observable<Gasto> {
    return this.http
      .post<{ data: Gasto }>(urlApi(`/gastos`), { descripcion, monto })
      .pipe(map((r) => r.data));
  }
}
