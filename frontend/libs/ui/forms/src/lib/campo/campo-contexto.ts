import { InjectionToken, Signal } from '@angular/core';

export interface UiCampoContexto {
  readonly requerido: Signal<boolean>;
  readonly invalido: Signal<boolean>;
  readonly errorId: Signal<string | null>;
  readonly controlId: Signal<string | null>;
  // Para controles que no son elementos de formulario nativos (MatSelect es un div con
  // role="combobox"): label[for] no los nombra, aria-labelledby si.
  readonly etiquetaId: Signal<string | null>;
  // La ayuda tambien describe al control; null si el campo no tiene ayuda.
  readonly ayudaId: Signal<string | null>;
}

export const UI_CAMPO_CONTEXTO = new InjectionToken<UiCampoContexto>('UI_CAMPO_CONTEXTO');
