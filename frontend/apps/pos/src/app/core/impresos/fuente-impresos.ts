import { Injectable, Injector, inject } from '@angular/core';
import { ApartadoService } from '@nianva/domain-apartados';
import { CajaService, VentaService } from '@nianva/domain-tpv';
import type { Impreso } from '@nianva/ui-print';
import { Observable, map } from 'rxjs';

import { impresoDeAbono, impresoDeCorte, impresoDeVenta } from './impresos-desde-servidor';

/** Los documentos que se imprimen en B3 (UI-12): ticket de venta, corte de caja y comprobante de abono. */
export type DocumentoImprimible =
  | { tipo: 'venta'; venta: string }
  | { tipo: 'corte'; caja: string }
  | { tipo: 'abono'; apartado: string; abono: string };

/**
 * De dónde sale la foto del documento lista para imprimir (UI-12): `GET .../impreso` de cada
 * documento (A6), con la sucursal del documento, el folio, la fecha y el usuario. Los servicios
 * HTTP viven en libs/domain (ARQ-12); aquí solo se traduce la respuesta al impreso de `ui/print`.
 * Abstracto para que las pantallas se prueben con un impreso fijo.
 */
@Injectable({ providedIn: 'root', useFactory: () => new FuenteImpresosDelServidor() })
export abstract class FuenteImpresos {
  /** false si el servidor no publica impresos: la pantalla no ofrece imprimir. */
  abstract readonly disponible: boolean;
  abstract obtener(documento: DocumentoImprimible): Observable<Impreso>;
}

export class FuenteImpresosDelServidor extends FuenteImpresos {
  readonly disponible = true;

  // Cada servicio se pide al imprimir: una pantalla de ventas no necesita el de apartados.
  private readonly injector = inject(Injector);

  obtener(documento: DocumentoImprimible): Observable<Impreso> {
    switch (documento.tipo) {
      case 'venta':
        return this.injector.get(VentaService).impreso(documento.venta).pipe(map(impresoDeVenta));
      case 'corte':
        return this.injector.get(CajaService).impreso(documento.caja).pipe(map(impresoDeCorte));
      case 'abono':
        return this.injector.get(ApartadoService).impresoAbono(documento.apartado, documento.abono).pipe(map(impresoDeAbono));
    }
  }
}
