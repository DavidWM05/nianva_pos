import { cantidadANumero } from '@nianva/ui-format';
import { Injectable, inject } from '@angular/core';
import { BuscadorDeHijos, EntidadBuscable } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { ProductoService } from '@nianva/domain-inventario';

/**
 * "Hijos" de un producto = sus variantes. La etiqueta es el `nombre` armado
 * por sus atributos (ARQ-07), o "Variante #id" si no tiene, y se expone
 * como EntidadBuscable, para que
 * EntidadSelectorComponent (generico) no necesite saber nada de
 * producto-variantes.
 */
@Injectable({ providedIn: 'root' })
export class VariantesDeProductoBuscadorService extends BuscadorDeHijos<EntidadBuscable> {
  private readonly productoService = inject(ProductoService);

  hijosDe(productoId: number): Observable<EntidadBuscable[]> {
    return this.productoService.obtener(productoId).pipe(
      map(({ producto }) =>
        (producto.variantes ?? []).map((variante) => ({
          id: variante.id,
          nombre: variante.nombre ?? `Variante #${variante.id}`,
          stock_actual: variante.stock_actual === undefined ? undefined : cantidadANumero(variante.stock_actual),
        })),
      ),
    );
  }
}
