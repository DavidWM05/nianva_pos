import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  CatalogoSimple,
  MovimientoKardex,
  Producto,
  ProductoVariante,
  ProductosPagina,
  ProductosPermisos,
} from './producto.types';

export interface ProductoFormPayload {
  nombre: string;
  descripcion?: string | null;
  categoria_id?: number | null;
  departamento_id?: number | null;
  precio_compra?: number | null;
  precio_venta?: number | null;
  no_resurtible?: boolean;
  sin_descuento?: boolean;
}

export interface VarianteFormPayload {
  talla?: string | null;
  color?: string | null;
  codigo_barras?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);

  /** Mismo contrato que ClienteService.listar() -- ver el reporte de CRM. */
  listar(
    evento: DataTableLazyEvent,
    busqueda: string,
  ): Observable<ProductosPagina> {
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
      .get<RespuestaDe<'/productos', 'get'>>(urlApi(`/productos`), {
        params,
      })
      .pipe(
        map((r) => {
          if (!('meta' in r))
            throw new Error('El listado requiere la respuesta paginada.');
          return {
            data: r.data as Producto[],
            total: r.meta.total,
            permisos: r.meta.permisos,
          };
        }),
      );
  }

  obtener(
    id: number,
  ): Observable<{ producto: Producto; permisos: ProductosPermisos }> {
    return this.http
      .get<RespuestaDe<'/productos/{producto}', 'get'>>(
        urlApi(`/productos/${id}`),
      )
      .pipe(
        map((r) => ({
          producto: r.data as Producto,
          permisos: r.meta.permisos,
        })),
      );
  }

  crear(payload: ProductoFormPayload): Observable<Producto> {
    const cuerpo: CuerpoDe<'/productos', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/productos', 'post'>>(urlApi(`/productos`), cuerpo)
      .pipe(map((r) => r.data as Producto));
  }

  actualizar(id: number, payload: ProductoFormPayload): Observable<Producto> {
    const cuerpo: CuerpoDe<'/productos/{producto}', 'put'> = payload;
    return this.http
      .put<RespuestaDe<'/productos/{producto}', 'put'>>(
        urlApi(`/productos/${id}`),
        cuerpo,
      )
      .pipe(map((r) => r.data as Producto));
  }

  desactivar(id: number): Observable<Producto> {
    return this.http
      .patch<RespuestaDe<'/productos/{producto}/desactivar', 'patch'>>(
        urlApi(`/productos/${id}/desactivar`),
        {},
      )
      .pipe(map((r) => r.data as Producto));
  }

  /**
   * `solo_activos=1` preserva el contrato original de este endpoint (lista
   * plana sin paginar) -- CategoriaController/DepartamentoController ahora
   * tienen CRUD completo (ver CategoriasListComponent), pero este selector
   * de ProductoFormComponent sigue pidiendo solo la version simple.
   */
  categorias(): Observable<CatalogoSimple[]> {
    return this.http
      .get<RespuestaDe<'/categorias', 'get'>>(urlApi(`/categorias`), {
        params: { solo_activos: 1 },
      })
      .pipe(map((r) => r.data));
  }

  departamentos(): Observable<CatalogoSimple[]> {
    return this.http
      .get<RespuestaDe<'/departamentos', 'get'>>(urlApi(`/departamentos`), {
        params: { solo_activos: 1 },
      })
      .pipe(map((r) => r.data));
  }

  crearVariante(
    productoId: number,
    payload: VarianteFormPayload,
  ): Observable<ProductoVariante> {
    const cuerpo: CuerpoDe<'/productos/{producto}/variantes', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/productos/{producto}/variantes', 'post'>>(
        urlApi(`/productos/${productoId}/variantes`),
        cuerpo,
      )
      .pipe(map((r) => r.data as ProductoVariante));
  }

  actualizarVariante(
    varianteId: number,
    payload: VarianteFormPayload,
  ): Observable<ProductoVariante> {
    const cuerpo: CuerpoDe<'/producto-variantes/{variante}', 'put'> = payload;
    return this.http
      .put<RespuestaDe<'/producto-variantes/{variante}', 'put'>>(
        urlApi(`/producto-variantes/${varianteId}`),
        cuerpo,
      )
      .pipe(map((r) => r.data as ProductoVariante));
  }

  desactivarVariante(varianteId: number): Observable<ProductoVariante> {
    return this.http
      .patch<RespuestaDe<'/producto-variantes/{variante}/desactivar', 'patch'>>(
        urlApi(`/producto-variantes/${varianteId}/desactivar`),
        {},
      )
      .pipe(map((r) => r.data as ProductoVariante));
  }

  kardex(varianteId: number): Observable<MovimientoKardex[]> {
    return this.http
      .get<RespuestaDe<'/producto-variantes/{variante}/kardex', 'get'>>(
        urlApi(`/producto-variantes/${varianteId}/kardex`),
      )
      .pipe(map((r) => r.data as MovimientoKardex[]));
  }
}
