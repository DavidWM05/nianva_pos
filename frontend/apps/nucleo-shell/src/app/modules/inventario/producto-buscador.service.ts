import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { ProductoService } from './producto.service';
import { Producto } from './producto.types';

/**
 * Adapta ProductoService (paginado, con `evento`/`busqueda` propios de
 * DataTableComponent) al contrato generico BuscadorEntidad que pide
 * EntidadSelectorComponent (ui-shared). Se registra contra un token de
 * inyeccion en app.config.ts -- ver core/buscadores-entidad.tokens.ts.
 */
@Injectable({ providedIn: 'root' })
export class ProductoBuscadorService extends BuscadorEntidad<Producto> {
  private readonly productoService = inject(ProductoService);

  buscar(texto: string): Observable<Producto[]> {
    return this.productoService
      .listar({ first: 0, rows: 10, sortField: null, sortOrder: null, filters: {} }, texto)
      .pipe(map((respuesta) => respuesta.data));
  }

  obtener(id: number): Observable<Producto> {
    return this.productoService.obtener(id).pipe(map((respuesta) => respuesta.producto));
  }
}
