import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { BtnEnviarComponent, CampoComponent } from '@nianva/ui-forms';
import { FormActionsComponent } from '@nianva/ui-layout';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';
import { TwoFactorCodeInputComponent } from '../../two-factor-code-input/two-factor-code-input.component';

/** El codigo TOTP de la app, o uno de los codigos de recuperacion que se guardaron al activar el 2FA. */
export type ModoVerificacion = 'totp' | 'recuperacion';

/** Como los genera TwoFactorService::generateRecoveryCodes(): 10 alfanumericos, guion y otros 10. */
const FORMATO_RECUPERACION = /^[A-Z0-9]{10}-[A-Z0-9]{10}$/;

/**
 * Segundo paso del login cuando el usuario ya tiene 2FA confirmado (ver
 * AuthController::login() del backend: la sesion NO se establece hasta
 * que este paso se completa). Si no hay un login pendiente (se entro
 * directo a esta URL, o ya expiro), el backend responde 419 y se manda
 * de vuelta a /login.
 *
 * Quien perdio su app de autenticacion entra con un codigo de recuperacion: va en el mismo campo
 * `code` de /login/2fa-verify (TwoFactorController::verifyLogin), que lo compara en mayusculas y
 * lo borra al usarlo.
 */
@Component({
  selector: 'nucleo-two-factor-verify',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatInput,
    BtnEnviarComponent,
    CampoComponent,
    FormActionsComponent,
    TwoFactorCodeInputComponent,
  ],
  templateUrl: './two-factor-verify.component.html',
  styleUrl: './two-factor-verify.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorVerifyComponent {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  @ViewChild(TwoFactorCodeInputComponent) private codeInput?: TwoFactorCodeInputComponent;

  protected readonly modo = signal<ModoVerificacion>('totp');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly recuperacion = new FormControl('', { nonNullable: true });

  /** Cambia entre el codigo de la app y el de recuperacion: limpia el error anterior y enfoca el campo nuevo. */
  cambiarModo(modo: ModoVerificacion): void {
    this.modo.set(modo);
    this.error.set(null);
    this.recuperacion.reset('');

    afterNextRender(() => this.host.nativeElement.querySelector<HTMLInputElement>('form input')?.focus(), {
      injector: this.injector,
    });
  }

  onCodeSubmit(code: string): void {
    this.verificar(code);
  }

  /** Quita los espacios y pasa a mayusculas; si el formato no es el de un codigo, no llama al backend. */
  onRecuperacionSubmit(event: Event): void {
    event.preventDefault();

    if (this.enviando()) {
      return;
    }

    const codigo = this.recuperacion.value.replace(/\s+/g, '').toUpperCase();
    this.recuperacion.setValue(codigo);

    if (! FORMATO_RECUPERACION.test(codigo)) {
      // ui-campo muestra el texto de `servidor` y lo quita en cuanto el usuario edita el campo.
      this.rechazarRecuperacion('El código tiene 10 letras o números, un guion y otros 10 (XXXXXXXXXX-XXXXXXXXXX).');

      return;
    }

    this.verificar(codigo);
  }

  private verificar(code: string): void {
    this.enviando.set(true);
    this.error.set(null);

    this.authService.verifyTwoFactor(code).subscribe({
      next: ({ user }) => {
        this.enviando.set(false);
        this.authState.setUsuario(user);
        this.router.navigateByUrl('/');
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);

        if (error.status === 419) {
          this.router.navigate(['/login']);

          return;
        }

        if (this.modo() === 'recuperacion') {
          this.rechazarRecuperacion('Código inválido.');

          return;
        }

        this.error.set('Código inválido.');
        this.codeInput?.limpiar();
      },
    });
  }

  private rechazarRecuperacion(mensaje: string): void {
    this.recuperacion.setErrors({ servidor: mensaje });
    this.recuperacion.markAsTouched();
  }
}
