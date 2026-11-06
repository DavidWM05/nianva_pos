import { ApplicationConfig, provideAppInitializer, inject } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { REGISTRO_NAVEGACION } from '@nianva/ui-layout';

import { CATALOGO_NAVEGACION } from './navegacion';
import { appRoutes } from './app.routes';
import { TemaService } from './tema.service';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: REGISTRO_NAVEGACION, useValue: CATALOGO_NAVEGACION },
    provideRouter(appRoutes),
    provideAnimationsAsync(),
    provideAppInitializer(() => inject(TemaService).inicializar()),
  ],
};
