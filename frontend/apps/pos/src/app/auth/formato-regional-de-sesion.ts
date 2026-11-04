import { Provider, inject } from '@angular/core';
import { FORMATO_REGIONAL, FORMATO_REGIONAL_DEFAULTS, FormatoRegional } from '@nianva/ui-format';

import { SesionActualService } from './sesion-actual.service';

/**
 * FORMATO_REGIONAL de la app: la moneda, la zona horaria y el locale salen de GET /sesion
 * (API-09); sin sesion, los valores por defecto. Los pipes de ui/format leen el objeto en
 * cada transformacion, asi que los getters toman la sesion vigente.
 */
export function provideFormatoRegionalDeSesion(): Provider {
  return {
    provide: FORMATO_REGIONAL,
    useFactory: (): FormatoRegional => {
      const sesion = inject(SesionActualService).sesion;

      return {
        get locale() {
          return sesion()?.regional.locale ?? FORMATO_REGIONAL_DEFAULTS.locale;
        },
        get moneda() {
          return sesion()?.regional.moneda ?? FORMATO_REGIONAL_DEFAULTS.moneda;
        },
        get zonaHoraria() {
          return sesion()?.regional.zona_horaria ?? FORMATO_REGIONAL_DEFAULTS.zonaHoraria;
        },
      };
    },
  };
}
