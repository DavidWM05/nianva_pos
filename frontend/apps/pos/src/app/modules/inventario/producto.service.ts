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
  listar(evento: DataTableLazyEvent, busqueda: string): Observable<ProductosPagina> {
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
      .get<{ data: Producto[]; meta: { total: number; permisos: ProductosPermisos } }>(urlApi(`/productos`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<{ producto: Producto; permisos: ProductosPermisos }> {
    return this.http
      .get<{ data: Producto; meta: { permisos: ProductosPermisos } }>(urlApi(`/productos/${id}`))
      .pipe(map((r) => ({ producto: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: ProductoFormPayload): Observable<Producto> {
    return this.http.post<{ data: Producto }>(urlApi(`/productos`), payload).pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: ProductoFormPayload): Observable<Producto> {
    return this.http.put<{ data: Producto }>(urlApi(`/productos/${id}`), payload).pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<Producto> {
    return this.http
      .patch<{ data: Producto }>(urlApi(`/productos/${id}/desactivar`), {})
      .pipe(map((r) => r.data));
  }

  /**
   * `solo_activos=1` preserva el contrato original de este endpoint (lista
   * plana sin paginar) -- CategoriaController/DepartamentoController ahora
   * tienen CRUD completo (ver CategoriasListComponent), pero este selector
   * de ProductoFormComponent sigue pidiendo solo la version simple.
   */
  categorias(): Observable<CatalogoSimple[]> {
    return this.http
      .get<{ data: CatalogoSimple[] }>(urlApi(`/categorias`), { params: { solo_activos: 1 } })
      .pipe(map((r) => r.data));
  }

  departamentos(): Observable<CatalogoSimple[]> {
    return this.http
      .get<{ data: CatalogoSimple[] }>(urlApi(`/departamentos`), { params: { solo_activos: 1 } })
      .pipe(map((r) => r.data));
  }

  crearVariante(productoId: number, payload: VarianteFormPayload): Observable<ProductoVariante> {
    return this.http
      .post<{ data: ProductoVariante }>(urlApi(`/productos/${productoId}/variantes`), payload)
      .pipe(map((r) => r.data));
  }

  actualizarVariante(varianteId: number, payload: VarianteFormPayload): Observable<ProductoVariante> {
    return this.http
      .put<{ data: ProductoVariante }>(urlApi(`/producto-variantes/${varianteId}`), payload)
      .pipe(map((r) => r.data));
  }

  desactivarVariante(varianteId: number): Observable<ProductoVariante> {
    return this.http
      .patch<{ data: ProductoVariante }>(urlApi(`/producto-variantes/${varianteId}/desactivar`), {})
      .pipe(map((r) => r.data));
  }

  kardex(varianteId: number): Observable<MovimientoKardex[]> {
    return this.http
      .get<{ data: MovimientoKardex[] }>(urlApi(`/producto-variantes/${varianteId}/kardex`))
      .pipe(map((r) => r.data));
  }
}
