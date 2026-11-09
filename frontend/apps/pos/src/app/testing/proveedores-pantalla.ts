import { EnvironmentProviders, Provider } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { REGISTRO_NAVEGACION } from '@nianva/ui-layout';

import { REGISTRO_NAVEGACION_POS } from '../modules/modules.config';

/** Providers comunes de una pantalla migrada a libs/ui en pruebas unitarias. */
export function proveedoresDePantalla(): (Provider | EnvironmentProviders)[] {
  return [
    provideAnimationsAsync(),
    provideRouter([]),
    { provide: REGISTRO_NAVEGACION, useValue: REGISTRO_NAVEGACION_POS },
  ];
}
