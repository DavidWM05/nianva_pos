import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { UnidadMedidaService } from './unidad-medida.service';
import { UnidadMedida } from './unidad-medida.types';

/**
 * Adapta UnidadMedidaService (sin paginar, sin busqueda por texto en el
 * backend -- ver su docblock) al contrato generico BuscadorEntidad,
 * filtrando client-side sobre la lista completa. Mismo patron que
 * ClienteBuscadorService/UsuarioBuscadorService. Primer consumidor:
 * Producción (unidad_medida_id en Insumos/RecetaIngrediente).
 */
@Injectable({ providedIn: 'root' })
export class UnidadMedidaBuscadorService extends BuscadorEntidad<UnidadMedida> {
  private readonly unidadMedidaService = inject(UnidadMedidaService);

  buscar(texto: string): Observable<UnidadMedida[]> {
    return this.unidadMedidaService.listar().pipe(
      map((unidades) =>
        texto.trim() ? unidades.filter((u) => u.nombre.toLowerCase().includes(texto.trim().toLowerCase())) : unidades,
      ),
    );
  }

  obtener(id: number): Observable<UnidadMedida> {
    return this.unidadMedidaService.listar().pipe(
      map((unidades) => {
        const encontrada = unidades.find((u) => u.id === id);
        if (!encontrada) throw new Error(`Unidad de medida ${id} no encontrada.`);

        return encontrada;
      }),
    );
  }
}
