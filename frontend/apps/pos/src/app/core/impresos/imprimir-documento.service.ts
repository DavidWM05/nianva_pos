import { Injectable, inject, signal } from '@angular/core';
import { FormatoImpreso, ImpresionService } from '@nianva/ui-print';
import { ToastService } from '@nianva/ui-shared';
import { Observable, finalize, map, tap } from 'rxjs';

import { DocumentoImprimible, FuenteImpresos } from './fuente-impresos';

/**
 * Imprime un documento (UI-12): pide su foto al servidor y la pinta con ImpresionService. No
 * vuelve a registrar nada: imprimir dos veces la misma venta no la cobra otra vez. La sucursal,
 * el folio, la fecha y el usuario salen del documento, nunca de la sesión.
 */
@Injectable({ providedIn: 'root' })
export class ImprimirDocumentoService {
  private readonly fuente = inject(FuenteImpresos);
  private readonly impresion = inject(ImpresionService);
  private readonly toast = inject(ToastService);

  /** true mientras se pide la foto: el botón muestra su indicador y no se duplica. */
  readonly imprimiendo = signal(false);

  get disponible(): boolean {
    return this.fuente.disponible;
  }

  imprimir(documento: DocumentoImprimible, formato: FormatoImpreso): Observable<void> {
    this.imprimiendo.set(true);

    return this.fuente.obtener(documento).pipe(
      tap({
        next: (impreso) => this.impresion.imprimir(impreso, formato),
        error: () => this.toast.error('No se pudo preparar el impreso. Intenta de nuevo.'),
      }),
      map(() => undefined),
      finalize(() => this.imprimiendo.set(false)),
    );
  }
}
