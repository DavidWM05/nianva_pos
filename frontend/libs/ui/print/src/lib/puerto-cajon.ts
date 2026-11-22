import { Injectable } from '@angular/core';

/**
 * Puerto del cajón de dinero (F4-2). Abrirlo bajo demanda necesita un adaptador ESC/POS, que llega
 * cuando haya hardware para probarlo; mientras tanto, el driver de la impresora puede abrir el
 * cajón al imprimir. La app provee su adaptador con `{ provide: PuertoCajon, useClass: ... }`; la
 * clase del adaptador lleva su propio `@Injectable()`, o heredaría la fábrica de este puerto.
 */
@Injectable({ providedIn: 'root', useFactory: () => new CajonSinAdaptador() })
export abstract class PuertoCajon {
  /** false mientras no haya adaptador: la pantalla no ofrece "Abrir cajón". */
  abstract readonly disponible: boolean;
  abstract abrir(): Promise<void>;
}

/** Sin adaptador: no hay cajón que abrir desde el navegador. */
export class CajonSinAdaptador extends PuertoCajon {
  readonly disponible = false;

  async abrir(): Promise<void> {
    return undefined;
  }
}
