import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { map } from 'rxjs';
import { conUmbral } from '@nianva/ui-feedback';
import { CampoComponent, InputCodigoComponent } from '@nianva/ui-forms';

/**
 * Captura de un codigo TOTP de 6 digitos -- extraido de la pantalla de
 * verificacion de login (two-factor-verify) para reutilizarse tambien en
 * la confirmacion de "desactivar 2FA" del perfil de seguridad. No sabe a
 * que endpoint va el codigo (login/2fa-verify, two-factor/disable, etc.);
 * solo lo captura y lo emite -- el llamador decide que hacer con el y le
 * pasa de vuelta `enviando`/`error`.
 */
@Component({
  selector: 'nucleo-two-factor-code-input',
  standalone: true,
  imports: [ReactiveFormsModule, MatButton, CampoComponent, InputCodigoComponent],
  templateUrl: './two-factor-code-input.component.html',
  styleUrl: './two-factor-code-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorCodeInputComponent {
  /** Mientras la pantalla espera la respuesta: boton deshabilitado y, pasado el umbral, su indicador (UI-18). */
  @Input() set enviando(valor: boolean) {
    this.enviandoAhora.set(valor);
  }
  get enviando(): boolean {
    return this.enviandoAhora();
  }
  /** El rechazo del codigo: va como error del campo, asi ui-campo lo muestra y lo asocia (aria-describedby). */
  @Input() set error(valor: string | null) {
    this.mensajeError = valor;
    // ui-campo quita el error del servidor en cuanto un control modificado cambia: el rechazo lo
    // deja como recien cargado, y el error se va cuando el usuario vuelva a escribir.
    this.code.markAsPristine();
    this.code.updateValueAndValidity();
    if (valor) {
      this.code.markAsTouched();
    }
  }
  get error(): string | null {
    return this.mensajeError;
  }
  @Input() submitLabel = 'Verificar';

  @Output() codeSubmit = new EventEmitter<string>();

  // El rechazo es un validador y no un setErrors: la directiva [formControl] vuelve a validar al
  // enlazarse (y setValue tambien), y un error puesto a mano se perderia.
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: () => (this.mensajeError ? { servidor: this.mensajeError } : null),
  });
  /** Señal del valor: con OnPush, un setValue desde código (limpiar, un rechazo) también refresca el botón. */
  protected readonly codigoCompleto = toSignal(this.code.valueChanges.pipe(map((valor) => valor.length === 6)), {
    initialValue: false,
  });
  protected readonly enviandoAhora = signal(false);
  protected readonly indicadorEnvio = conUmbral(this.enviandoAhora);
  private mensajeError: string | null = null;

  onSubmit(event: Event): void {
    event.preventDefault();

    if (this.code.value.length !== 6) {
      return;
    }

    this.codeSubmit.emit(this.code.value);
  }

  /** Para que el llamador pueda limpiar el campo tras un codigo rechazado. */
  limpiar(): void {
    this.code.setValue('');
  }
}
