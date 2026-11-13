import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { CODIGOS_EN_PANTALLA } from '../../core/errores.interceptor';
import { GenerarNominaPayload, Nomina } from './nomina.types';

export interface NominasPermisos {
  crear: boolean;
}

export interface NominasPagina {
  data: Nomina[];
  total: number;
  permisos: NominasPermisos;
}

@Injectable({ providedIn: 'root' })
export class NominaService {
  private readonly http = inject(HttpClient);
  // La pantalla muestra su propio mensaje para `sucursal_requerida` (ARQ-12); el resto, el interceptor.
  private readonly sucursalEnPantalla = new HttpContext().set(
    CODIGOS_EN_PANTALLA,
    ['sucursal_requerida'],
  );

  listar(evento: DataTableLazyEvent): Observable<NominasPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<RespuestaDe<'/nominas', 'get'>>(urlApi(`/nominas`), { params })
      .pipe(
        map((r) => ({
          data: r.data as Nomina[],
          total: r.meta.total,
          permisos: { ...r.meta.permisos, crear: r.meta.permisos['crear'] },
        })),
      );
  }

  obtener(id: number): Observable<Nomina> {
    return this.http
      .get<RespuestaDe<'/nominas/{nomina}', 'get'>>(urlApi(`/nominas/${id}`))
      .pipe(map((r) => r.data as Nomina));
  }

  generar(payload: GenerarNominaPayload): Observable<Nomina> {
    return this.http
      .post<RespuestaDe<'/nominas/generar', 'post'>>(
        urlApi(`/nominas/generar`),
        payload satisfies CuerpoDe<'/nominas/generar', 'post'>,
        { context: this.sucursalEnPantalla },
      )
      .pipe(map((r) => r.data as Nomina));
  }

  pagar(id: number): Observable<Nomina> {
    return this.http
      .patch<RespuestaDe<'/nominas/{id}/pagar', 'patch'>>(
        urlApi(`/nominas/${id}/pagar`),
        {},
      )
      .pipe(map((r) => r.data as Nomina));
  }
}
