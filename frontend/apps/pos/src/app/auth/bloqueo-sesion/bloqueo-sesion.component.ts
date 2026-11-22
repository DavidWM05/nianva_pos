import { ChangeDetectionStrategy, Component, Injector, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { AuthApiService } from '@nianva/domain-sesion';
import { BtnEnviarComponent, CampoComponent, InputPinComponent } from '@nianva/ui-forms';
import { FormActionsComponent } from '@nianva/ui-layout';
import { PantallaBloqueoComponent } from '@nianva/ui-overlays';
import { ToastService, esErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { from, of, switchMap } from 'rxjs';

import { AuthStateService } from '../auth-state.service';
import { AuthService } from '../auth.service';
import { BloqueoSesionService } from '../bloqueo-sesion.service';
import { SesionEntrePestanasService } from '../sesion-entre-pestanas.service';

/**
 * Pantalla de bloqueo de la sesion (SEG-12), montada una vez en la raiz. Pide el PIN de caja del
 * mismo usuario: nunca cambia de usuario ni reemplaza al login, y la salida es cerrar sesion. Al
 * recargar con la sesion bloqueada no hay sesion cargada (GET /sesion respondio 423): se carga al
 * desbloquear, antes de soltar al guard que espera.
 */
@Component({
  selector: 'nucleo-bloqueo-sesion',
  standalone: true,
  imports: [BtnEnviarComponent, CampoComponent, FormActionsComponent, FormsModule, InputPinComponent, MatButton, PantallaBloqueoComponent],
  template: `
    @if (bloqueo.activa()) {
      <ui-pantalla-bloqueo titulo="Sesión bloqueada">
        <form (ngSubmit)="desbloquear()">
          <p>Ingresa tu PIN de caja para continuar.</p>
          <ui-campo etiqueta="PIN de caja">
            <ui-input-pin name="pin" [longitud]="6" [ngModel]="pin()" (ngModelChange)="pin.set($event)" />
          </ui-campo>
          <p role="alert">{{ error() }}</p>
          <ui-form-actions>
            <button matButton="outlined" type="button" (click)="salir()">Cerrar sesión</button>
            <!-- Sin deshabilitar por el largo del PIN: un Enter justo tras el ultimo digito debe enviar. -->
            <ui-btn-enviar etiqueta="Desbloquear" [enviando]="enviando()" />
          </ui-form-actions>
        </form>
      </ui-pantalla-bloqueo>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BloqueoSesionComponent {
  protected readonly bloqueo = inject(BloqueoSesionService);
  private readonly api = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly auth = inject(AuthService);
  private readonly sesion = inject(SesionEntrePestanasService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly entradaPin = viewChild(InputPinComponent);

  protected readonly pin = signal('');
  protected readonly error = signal('');
  protected readonly enviando = signal(false);

  constructor() {
    effect(() => {
      if (this.bloqueo.activa()) {
        this.pin.set('');
        this.error.set('');
        this.enfocarPin();
      }
    });
  }

  protected desbloquear(): void {
    if (this.enviando()) {
      return;
    }
    if (this.pin().length < 4) {
      this.error.set('Escribe tu PIN de caja: de 4 a 6 dígitos.');
      this.enfocarPin();
      return;
    }

    this.enviando.set(true);
    this.api
      .desbloquearSesion(this.pin())
      .pipe(switchMap(() => (this.authState.autenticado() ? of(undefined) : from(this.authState.initialize()))))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.bloqueo.desactivar();
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.pin.set('');
          if (esErrorNegocio(error, 'pin_caja_intentos_agotados')) {
            // El servidor ya cerro la sesion: se cierra tambien aqui y en las otras pestanas.
            this.toast.error('Se agotaron los intentos de PIN. Vuelve a iniciar sesión.', 'Sesión cerrada');
            this.bloqueo.descartar();
            this.sesion.cerrarSesion();
            return;
          }
          this.error.set(
            esErrorNegocio(error, 'pin_caja_incorrecto') ? 'El PIN no es correcto.' : mensajeError(error, 'No se pudo desbloquear la sesión.'),
          );
          this.enfocarPin();
        },
      });
  }

  protected salir(): void {
    this.bloqueo.descartar();
    this.auth.logout().subscribe({ error: () => this.sesion.cerrarSesion() });
  }

  private enfocarPin(): void {
    afterNextRender(() => this.entradaPin()?.focus(), { injector: this.injector });
  }
}
