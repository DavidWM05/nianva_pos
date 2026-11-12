import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  Categoria,
  CategoriasPagina,
  CategoriasPermisos,
} from './categoria.types';

export interface CategoriaFormPayload {
  nombre: string;
  descripcion?: string | null;
}

/** Mismo contrato que ClienteService -- ver el reporte de CRM/Precios. */
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly http = inject(HttpClient);

  listar(
    evento: DataTableLazyEvent,
    busqueda: string,
  ): Observable<CategoriasPagina> {
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
      .get<RespuestaDe<'/categorias', 'get'>>(urlApi(`/categorias`), {
        params,
      })
      .pipe(
        map((r) => {
          if (!('meta' in r))
            throw new Error('El listado requiere la respuesta paginada.');
          return {
            data: r.data as Categoria[],
            total: r.meta.total,
            permisos: r.meta.permisos,
          };
        }),
      );
  }

  obtener(
    id: number,
  ): Observable<{ categoria: Categoria; permisos: CategoriasPermisos }> {
    return this.http
      .get<RespuestaDe<'/categorias/{categoria}', 'get'>>(
        urlApi(`/categorias/${id}`),
      )
      .pipe(
        map((r) => ({
          categoria: r.data as Categoria,
          permisos: r.meta.permisos,
        })),
      );
  }

  crear(payload: CategoriaFormPayload): Observable<Categoria> {
    const cuerpo: CuerpoDe<'/categorias', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/categorias', 'post'>>(urlApi(`/categorias`), cuerpo)
      .pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: CategoriaFormPayload): Observable<Categoria> {
    const cuerpo: CuerpoDe<'/categorias/{categoria}', 'put'> = payload;
    return this.http
      .put<RespuestaDe<'/categorias/{categoria}', 'put'>>(
        urlApi(`/categorias/${id}`),
        cuerpo,
      )
      .pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<Categoria> {
    return this.http
      .patch<RespuestaDe<'/categorias/{categoria}/desactivar', 'patch'>>(
        urlApi(`/categorias/${id}/desactivar`),
        {},
      )
      .pipe(map((r) => r.data));
  }
}
