import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputOtp } from 'primeng/inputotp';

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
  imports: [ReactiveFormsModule, InputOtp, Button],
  templateUrl: './two-factor-code-input.component.html',
  styleUrl: './two-factor-code-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorCodeInputComponent {
  @Input() enviando = false;
  @Input() error: string | null = null;
  @Input() submitLabel = 'Verificar';

  @Output() codeSubmit = new EventEmitter<string>();

  protected readonly code = new FormControl('', { nonNullable: true });

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
