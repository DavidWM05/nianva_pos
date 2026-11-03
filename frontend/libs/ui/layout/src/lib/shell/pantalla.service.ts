import { DestroyRef, Injectable, InjectionToken, inject, signal } from '@angular/core';

/**
 * Ancho (px) desde el que la pantalla deja de ser angosta: el breakpoint `md`
 * de ui/tokens. ui-tokens no se compila como lib, asi que aqui va el valor y
 * pantalla.service.spec.ts comprueba que coincide con `breakpoints.md`.
 */
export const ANCHO_PANTALLA_MD = new InjectionToken<number>('ANCHO_PANTALLA_MD', { factory: () => 768 });

/**
 * Si la pantalla es angosta (por debajo de `md`). Los componentes resuelven
 * su responsividad con esta senal (UI-04): una pantalla de `apps/**` no
 * declara `@media`.
 */
@Injectable({ providedIn: 'root' })
export class PantallaService {
  private readonly consulta =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${inject(ANCHO_PANTALLA_MD) - 1}px)`)
      : null;

  private readonly angostaSignal = signal(this.consulta?.matches ?? false);

  /** Verdadero por debajo de `md` (768 px). */
  readonly angosta = this.angostaSignal.asReadonly();

  constructor() {
    if (this.consulta === null) {
      return;
    }

    const alCambiar = (evento: MediaQueryListEvent) => this.angostaSignal.set(evento.matches);
    this.consulta.addEventListener('change', alCambiar);
    inject(DestroyRef).onDestroy(() => this.consulta?.removeEventListener('change', alCambiar));
  }
}
