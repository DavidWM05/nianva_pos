import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { RecetaService } from './receta.service';
import { Receta } from './receta.types';

/**
 * Adapta RecetaService (paginado, sin busqueda por texto -- ver
 * BUSCADOR_RECETA) al contrato generico BuscadorEntidad, filtrando
 * client-side sobre una pagina grande. Mismo patron que
 * InsumoBuscadorService. Consumidor: elegir receta al crear una orden de
 * producción.
 */
@Injectable({ providedIn: 'root' })
export class RecetaBuscadorService extends BuscadorEntidad<Receta> {
  private readonly recetaService = inject(RecetaService);

  buscar(texto: string): Observable<Receta[]> {
    return this.recetaService.listar({ first: 0, rows: 100, sortField: null, sortOrder: null, filters: {} }).pipe(
      map((respuesta) =>
        texto.trim()
          ? respuesta.data.filter((r) => r.nombre.toLowerCase().includes(texto.trim().toLowerCase()))
          : respuesta.data,
      ),
    );
  }

  /** No hay GET /recetas/{id} (recetasShow() no existe) -- mismo compromiso que InsumoBuscadorService. */
  obtener(id: number): Observable<Receta> {
    return this.recetaService.listar({ first: 0, rows: 100, sortField: null, sortOrder: null, filters: {} }).pipe(
      map((respuesta) => {
        const encontrada = respuesta.data.find((r) => r.id === id);
        if (!encontrada) throw new Error(`Receta ${id} no encontrada.`);

        return encontrada;
      }),
    );
  }
}
