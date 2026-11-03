import { Signal, effect, signal, untracked } from '@angular/core';

/** Una respuesta mas rapida que esto no llega a mostrar indicador. */
export const UMBRAL_INDICADOR_MS = 300;

/**
 * Sigue a `fuente` con un retraso al encenderse, para que el indicador de
 * carga no parpadee en respuestas rapidas (UI-18). Al apagarse `fuente`, el
 * resultado se apaga en el acto. Debe llamarse en un contexto de inyeccion
 * (un campo de componente).
 *
 *   protected readonly mostrarSkeleton = conUmbral(this.cargando);
 */
export function conUmbral(fuente: Signal<boolean>, retrasoMs = UMBRAL_INDICADOR_MS): Signal<boolean> {
  const visible = signal(false);

  effect((onCleanup) => {
    if (!fuente()) {
      untracked(() => visible.set(false));
      return;
    }

    const temporizador = setTimeout(() => visible.set(true), retrasoMs);
    onCleanup(() => clearTimeout(temporizador));
  });

  return visible.asReadonly();
}
