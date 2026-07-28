import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
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

  listar(evento: DataTableLazyEvent): Observable<EmpleadosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<{ data: Empleado[]; meta: { total: number; permisos: EmpleadosPermisos } }>(`${API_BASE_URL}/api/empleados`, { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<Empleado> {
    return this.http.get<{ data: Empleado }>(`${API_BASE_URL}/api/empleados/${id}`).pipe(map((r) => r.data));
  }

  crear(payload: EmpleadoCrearPayload): Observable<Empleado> {
    return this.http.post<{ data: Empleado }>(`${API_BASE_URL}/api/empleados`, payload).pipe(map((r) => r.data));
  }
}
