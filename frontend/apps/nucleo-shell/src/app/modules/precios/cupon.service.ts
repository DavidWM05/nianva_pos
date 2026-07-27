import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { Cupon, CuponesPagina, CuponesPermisos } from './cupon.types';

export interface CuponFormPayload {
  codigo: string;
  nombre: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: number;
  uso_maximo?: number | null;
  uso_maximo_por_cliente?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CuponService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent, busqueda: string): Observable<CuponesPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);
    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (busqueda.trim()) {
      params = params.set('filtro_nombre', busqueda.trim());
    }

    return this.http
      .get<{ data: Cupon[]; meta: { total: number; permisos: CuponesPermisos } }>(`${API_BASE_URL}/api/cupones`, { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  /** Mismo contrato que ClienteService.obtener() -- permisos sin 'crear' (show() no lo necesita). */
  obtener(id: number): Observable<{ cupon: Cupon; permisos: Omit<CuponesPermisos, 'crear'> }> {
    return this.http
      .get<{ data: Cupon; meta: { permisos: Omit<CuponesPermisos, 'crear'> } }>(`${API_BASE_URL}/api/cupones/${id}`)
      .pipe(map((r) => ({ cupon: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: CuponFormPayload): Observable<Cupon> {
    return this.http.post<{ data: Cupon }>(`${API_BASE_URL}/api/cupones`, payload).pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: CuponFormPayload): Observable<Cupon> {
    return this.http.put<{ data: Cupon }>(`${API_BASE_URL}/api/cupones/${id}`, payload).pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<Cupon> {
    return this.http.patch<{ data: Cupon }>(`${API_BASE_URL}/api/cupones/${id}/desactivar`, {}).pipe(map((r) => r.data));
  }
}
