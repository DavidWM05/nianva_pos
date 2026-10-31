import { Injectable, inject } from '@angular/core';
import { BuscadorDeHijos, EntidadBuscable } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { ProductoService } from './producto.service';

/**
 * "Hijos" de un producto = sus variantes. ProductoVariante no tiene un
 * campo `nombre` (el dominio usa talla/color) -- este adapter arma la
 * etiqueta ("talla / color", o "Variante #id" si no tiene ninguno de
 * los dos) antes de exponerla como EntidadBuscable, para que
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
          nombre: this.etiqueta(variante.talla, variante.color, variante.id),
          stock_actual: variante.stock_actual,
        })),
      ),
    );
  }

  private etiqueta(talla: string | null, color: string | null, id: number): string {
    const partes = [talla, color].filter((v) => !!v);

    return partes.length > 0 ? partes.join(' / ') : `Variante #${id}`;
  }
}
