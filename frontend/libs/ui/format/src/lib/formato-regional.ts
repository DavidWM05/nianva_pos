import { InjectionToken, Provider } from '@angular/core';

export interface FormatoRegional {
  locale: string;
  moneda: string;
  zonaHoraria: string;
}

export const FORMATO_REGIONAL_DEFAULTS: FormatoRegional = {
  locale: 'es-MX',
  moneda: '$',
  zonaHoraria: 'America/Mexico_City',
};

export const FORMATO_REGIONAL = new InjectionToken<FormatoRegional>('FORMATO_REGIONAL', {
  factory: () => ({ ...FORMATO_REGIONAL_DEFAULTS }),
});

export function provideFormatoRegional(parcial: Partial<FormatoRegional> = {}): Provider {
  return {
    provide: FORMATO_REGIONAL,
    useFactory: () => ({ ...FORMATO_REGIONAL_DEFAULTS, ...parcial }),
  };
}
