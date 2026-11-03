import { InjectionToken, Signal } from '@angular/core';

export interface UiCampoContexto {
  readonly requerido: Signal<boolean>;
  readonly invalido: Signal<boolean>;
  readonly errorId: Signal<string | null>;
  readonly controlId: Signal<string | null>;
}

export const UI_CAMPO_CONTEXTO = new InjectionToken<UiCampoContexto>('UI_CAMPO_CONTEXTO');
