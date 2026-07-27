import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, of, tap } from 'rxjs';

import { AuthService } from './auth.service';
import { Usuario } from './usuario.types';

/**
 * Fuente unica de verdad del estado de sesion en el frontend. authGuard,
 * el interceptor de 401, y el shell la consultan -- ninguno le pregunta a
 * AuthService directamente si "hay sesion", todos leen de aqui.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly authService = inject(AuthService);

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
   */
  initialize(): Promise<void> {
    return firstValueFrom(
      this.authService.me().pipe(
        tap((usuario) => this.usuarioSignal.set(usuario)),
        catchError(() => {
          this.usuarioSignal.set(null);

          return of(null);
        }),
      ),
    )
      .then(() => void 0)
      .finally(() => this.cargando.set(false));
  }

  setUsuario(usuario: Usuario | null): void {
    this.usuarioSignal.set(usuario);
  }

  clear(): void {
    this.usuarioSignal.set(null);
  }
}
