import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  Departamento,
  DepartamentosPagina,
  DepartamentosPermisos,
} from './departamento.types';

export interface DepartamentoFormPayload {
  nombre: string;
  descripcion?: string | null;
}

/** Mismo contrato que CategoriaService -- ver el reporte de Fase C. */
@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private readonly http = inject(HttpClient);

  listar(
    evento: DataTableLazyEvent,
    busqueda: string,
  ): Observable<DepartamentosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);
    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (busqueda.trim()) {
      params = params.set('filtro_nombre', busqueda.trim());
    }

    return this.http
      .get<RespuestaDe<'/departamentos', 'get'>>(urlApi(`/departamentos`), {
        params,
      })
      .pipe(
        map((r) => {
          if (!('meta' in r))
            throw new Error('El listado requiere la respuesta paginada.');
          return {
            data: r.data as Departamento[],
            total: r.meta.total,
            permisos: r.meta.permisos,
          };
        }),
      );
  }

  obtener(id: number): Observable<{
    departamento: Departamento;
    permisos: DepartamentosPermisos;
  }> {
    return this.http
      .get<RespuestaDe<'/departamentos/{departamento}', 'get'>>(
        urlApi(`/departamentos/${id}`),
      )
      .pipe(
        map((r) => ({
          departamento: r.data as Departamento,
          permisos: r.meta.permisos,
        })),
      );
  }

  crear(payload: DepartamentoFormPayload): Observable<Departamento> {
    const cuerpo: CuerpoDe<'/departamentos', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/departamentos', 'post'>>(
        urlApi(`/departamentos`),
        cuerpo,
      )
      .pipe(map((r) => r.data));
  }

  actualizar(
    id: number,
    payload: DepartamentoFormPayload,
  ): Observable<Departamento> {
    const cuerpo: CuerpoDe<'/departamentos/{departamento}', 'put'> = payload;
    return this.http
      .put<RespuestaDe<'/departamentos/{departamento}', 'put'>>(
        urlApi(`/departamentos/${id}`),
        cuerpo,
      )
      .pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<Departamento> {
    return this.http
      .patch<RespuestaDe<'/departamentos/{departamento}/desactivar', 'patch'>>(
        urlApi(`/departamentos/${id}/desactivar`),
        {},
      )
      .pipe(map((r) => r.data));
  }
}
