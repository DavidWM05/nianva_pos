import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { ConsultaPagina, urlApi } from '@nianva/core-http';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Empleado, EmpleadoCrearPayload } from './empleado.types';

export interface EmpleadosPermisos {
  crear: boolean;
}

export interface EmpleadosPagina {
  data: Empleado[];
  total: number;
  permisos: EmpleadosPermisos;
}

/** PayrollController no tiene empleadosUpdate() -- solo index()/show()/store(). */
@Injectable({ providedIn: 'root' })
export class EmpleadoService {
  private readonly http = inject(HttpClient);

  listar(evento: ConsultaPagina): Observable<EmpleadosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<RespuestaDe<'/empleados', 'get'>>(urlApi(`/empleados`), { params })
      .pipe(
        map((r) => ({
          data: r.data,
          total: r.meta.total,
          permisos: { ...r.meta.permisos, crear: r.meta.permisos['crear'] },
        })),
      );
  }

  obtener(id: number): Observable<Empleado> {
    return this.http
      .get<RespuestaDe<'/empleados/{empleado}', 'get'>>(
        urlApi(`/empleados/${id}`),
      )
      .pipe(map((r) => r.data));
  }

  crear(payload: EmpleadoCrearPayload): Observable<Empleado> {
    return this.http
      .post<RespuestaDe<'/empleados', 'post'>>(
        urlApi(`/empleados`),
        payload satisfies CuerpoDe<'/empleados', 'post'>,
      )
      .pipe(map((r) => r.data));
  }
}
