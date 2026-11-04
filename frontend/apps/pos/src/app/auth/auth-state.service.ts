import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, of, tap } from 'rxjs';

import { AuthService } from './auth.service';
import { SesionActualService } from './sesion-actual.service';
import { Usuario } from './usuario.types';

/**
 * Fuente unica de verdad del estado de sesion en el frontend. authGuard,
 * el interceptor de 401, y el shell la consultan -- ninguno le pregunta a
 * AuthService directamente si "hay sesion", todos leen de aqui.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly authService = inject(AuthService);
  private readonly sesionActual = inject(SesionActualService);

  private readonly usuarioSignal = signal<Usuario | null>(null);
  /** true mientras se resuelve el estado inicial (ver initialize()) -- el
   * guard no debe decidir nada antes de que esto termine. */
  readonly cargando = signal(true);

  readonly usuario = this.usuarioSignal.asReadonly();
  readonly autenticado = computed(() => this.usuarioSignal() !== null);
  readonly requiereConfigurarDosFactor = computed(() => {
    const usuario = this.usuarioSignal();

    return usuario !== null && usuario.requiere_dos_factor && !usuario.dos_factor_confirmado;
  });

  /**
   * Se llama una vez al arrancar la app (ver provideAppInitializer en
   * app.config.ts) -- intenta resolver quien es el usuario actual via la
   * cookie de sesion existente (si la hay), antes de que el router evalue
   * ningun guard. Un 401 es un resultado valido (invitado), no un error.
   *
   * Pide GET /sesion (API-09) en vez de /user: trae el mismo usuario mas los
   * permisos, los modulos activos y el formato regional (SesionActualService).
   */
  initialize(): Promise<void> {
    return firstValueFrom(
      this.authService.obtenerSesion().pipe(
        tap((sesion) => {
          this.usuarioSignal.set(sesion.usuario);
          this.sesionActual.establecer(sesion);
        }),
        catchError(() => {
          this.usuarioSignal.set(null);
          this.sesionActual.limpiar();

          return of(null);
        }),
      ),
    )
      .then(() => void 0)
      .finally(() => this.cargando.set(false));
  }

  /**
   * Tras el login o el 2FA. Solo fija el usuario: la sesion (permisos, modulos, formato) la
   * carga CargaSesionService al ver un usuario sin sesion.
   */
  setUsuario(usuario: Usuario | null): void {
    this.usuarioSignal.set(usuario);

    if (usuario === null) {
      this.sesionActual.limpiar();
    }
  }

  clear(): void {
    this.usuarioSignal.set(null);
    this.sesionActual.limpiar();
  }
}
