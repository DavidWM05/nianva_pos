import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { InsumoService } from './insumo.service';
import { Insumo } from './insumo.types';

/**
 * Adapta InsumoService (paginado, con `evento`/filtros propios de
 * DataTableComponent) al contrato generico BuscadorEntidad -- mismo
 * patron que ClienteBuscadorService. Consumidor: seleccionar insumos al
 * armar los ingredientes de una receta.
 */
@Injectable({ providedIn: 'root' })
export class InsumoBuscadorService extends BuscadorEntidad<Insumo> {
  private readonly insumoService = inject(InsumoService);

  buscar(texto: string): Observable<Insumo[]> {
    return this.insumoService
      .listar({ first: 0, rows: 10, sortField: null, sortOrder: null, filters: {} }, { nombre: texto })
      .pipe(map((respuesta) => respuesta.data));
  }

  /**
   * No hay GET /insumos/{id} (insumosShow() no existe) -- se resuelve
   * pidiendo la primera pagina de 100 y buscando ahi. Suficiente para el
   * unico consumidor real hoy (RecetaFormComponent, que nunca precarga
   * `valorInicial` porque Recetas es solo-crear), pero se rompe si el
   * insumo buscado no cae en esos primeros 100.
   */
  obtener(id: number): Observable<Insumo> {
    return this.insumoService.listar({ first: 0, rows: 100, sortField: null, sortOrder: null, filters: {} }).pipe(
      map((respuesta) => {
        const encontrado = respuesta.data.find((i) => i.id === id);
        if (!encontrado) throw new Error(`Insumo ${id} no encontrado.`);

        return encontrado;
      }),
    );
  }
}
