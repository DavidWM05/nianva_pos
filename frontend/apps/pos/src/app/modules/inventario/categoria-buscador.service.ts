import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad, EntidadBuscable } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { ProductoService } from './producto.service';

/**
 * Categoria no tiene un endpoint de "obtener una sola" -- la lista
 * completa ya viene de CategoriaController::index() (ver
 * ProductoService.categorias()) y es corta, asi que `buscar` ignora el
 * texto y devuelve la lista entera (el consumidor la filtra client-side
 * con un <p-select [filter]="true">, no con este metodo). `obtener`
 * busca dentro de esa misma lista.
 */
@Injectable({ providedIn: 'root' })
export class CategoriaBuscadorService extends BuscadorEntidad<EntidadBuscable> {
  private readonly productoService = inject(ProductoService);

  buscar(): Observable<EntidadBuscable[]> {
    return this.productoService.categorias();
  }

  obtener(id: number): Observable<EntidadBuscable> {
    return this.productoService
      .categorias()
      .pipe(map((categorias) => categorias.find((c) => c.id === id) ?? { id, nombre: `Categoría #${id}` }));
  }
}
