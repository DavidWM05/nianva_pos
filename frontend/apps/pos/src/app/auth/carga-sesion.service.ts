import { Injectable, effect, inject, untracked } from '@angular/core';

import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';
import { SesionActualService } from './sesion-actual.service';

/**
 * Carga GET /sesion (API-09) cuando hay usuario pero aun no hay sesion: justo despues del
 * login o del 2FA, que solo traen el usuario. Al arrancar la app la carga
 * AuthStateService.initialize(). Se activa una vez desde app.config.ts.
 */
@Injectable({ providedIn: 'root' })
export class CargaSesionService {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly sesionActual = inject(SesionActualService);
  private pidiendo = false;

  constructor() {
    effect(() => {
      const usuario = this.authState.usuario();
      const sesion = this.sesionActual.sesion();

      if (usuario === null || sesion !== null) {
        return;
      }

      untracked(() => this.pedir());
    });
  }

  /** Para app.config.ts: instanciar el servicio activa el effect. */
  iniciar(): void {
    return;
  }

  private pedir(): void {
    if (this.pidiendo) {
      return;
    }

    this.pidiendo = true;
    this.authService.obtenerSesion().subscribe({
      next: (sesion) => {
        this.pidiendo = false;
        this.sesionActual.establecer(sesion);
      },
      // Sin sesion el menu muestra todo y el backend sigue protegiendo cada ruta.
      error: () => {
        this.pidiendo = false;
      },
    });
  }
}
