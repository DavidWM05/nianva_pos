import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad, EntidadBuscable } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { VentaService } from '../tpv/venta.service';
import { Venta } from '../tpv/venta.types';

/**
 * Venta no tiene `nombre` -- arma la etiqueta "Venta #id - cliente - $total"
 * antes de exponerla como EntidadBuscable, mismo criterio que
 * VariantesDeProductoBuscadorService con talla/color. Solo ofrece ventas
 * `completada` (una anulada no tiene sentido ponerla a plazos) -- filtro de
 * UI, el backend no lo valida.
 */
@Injectable({ providedIn: 'root' })
export class VentaBuscadorService extends BuscadorEntidad<EntidadBuscable> {
  private readonly ventaService = inject(VentaService);

  buscar(texto: string): Observable<EntidadBuscable[]> {
    return this.ventaService
      .listar({ first: 0, rows: 10, sortField: null, sortOrder: null, filters: {} }, texto)
      .pipe(map((respuesta) => respuesta.data.filter((v) => v.estado === 'completada').map((v) => this.aBuscable(v))));
  }

  obtener(id: number): Observable<EntidadBuscable> {
    return this.ventaService.obtener(id).pipe(map((venta) => this.aBuscable(venta)));
  }

  private aBuscable(venta: Venta): EntidadBuscable {
    return { id: venta.id, nombre: `Venta #${venta.id} — ${venta.cliente?.nombre ?? 'Sin cliente'} — $${venta.total}` };
  }
}
