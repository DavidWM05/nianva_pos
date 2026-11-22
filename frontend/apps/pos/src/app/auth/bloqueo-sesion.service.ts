import { DOCUMENT } from '@angular/common';
import { Injectable, Injector, afterNextRender, inject, signal } from '@angular/core';

/**
 * Estado del bloqueo de la sesion (SEG-12). Se activa cuando el cajero bloquea la terminal o
 * cuando el servidor responde 423 `sesion_bloqueada` (tambien al recargar con la sesion
 * bloqueada); lo muestra BloqueoSesionComponent, montado una vez en la raiz.
 *
 * Solo estado y foco, sin HTTP: lo usan el interceptor y el guard, que no deben depender de los
 * servicios de sesion.
 */
@Injectable({ providedIn: 'root' })
export class BloqueoSesionService {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly activaSignal = signal(false);
  private focoPrevio: HTMLElement | null = null;
  private esperas: (() => void)[] = [];

  readonly activa = this.activaSignal.asReadonly();

  activar(): void {
    if (this.activaSignal()) {
      return;
    }

    const activo = this.document.activeElement;
    this.focoPrevio = activo instanceof HTMLElement && activo !== this.document.body ? activo : null;
    // Los dialogos de Material viven fuera del arbol de la app: tambien quedan inertes.
    this.contenedorOverlays()?.setAttribute('inert', '');
    this.activaSignal.set(true);
  }

  /** Desbloqueada: vuelve el foco a donde estaba, si ese elemento sigue en la pagina. */
  desactivar(): void {
    this.terminar();
    const foco = this.focoPrevio;
    this.focoPrevio = null;
    afterNextRender(() => (foco?.isConnected ? foco.focus() : undefined), { injector: this.injector });
  }

  /** La sesion se cerro estando bloqueada (intentos agotados o salir): no hay foco que volver. */
  descartar(): void {
    this.focoPrevio = null;
    this.terminar();
  }

  /** Para el guard: espera a que se desbloquee antes de decidir la navegacion. */
  esperarDesbloqueo(): Promise<void> {
    return this.activaSignal() ? new Promise((resolver) => this.esperas.push(resolver)) : Promise.resolve();
  }

  private terminar(): void {
    this.contenedorOverlays()?.removeAttribute('inert');
    this.activaSignal.set(false);
    const esperas = this.esperas;
    this.esperas = [];
    esperas.forEach((resolver) => resolver());
  }

  private contenedorOverlays(): Element | null {
    return this.document.querySelector('.cdk-overlay-container');
  }
}
