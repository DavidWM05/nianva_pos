import { ChangeDetectionStrategy, Component, EventEmitter, Output, ViewChild, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

export interface CambiarPasswordFormValue {
  password_actual: string;
  password: string;
  password_confirmation: string;
}

/**
 * password_confirmation se valida a mano en onSubmit (mismo criterio que
 * ResetPasswordComponent) -- un validador cruzado no vale la pena
 * agregarselo a DynamicFormField por este unico caso de uso.
 */
@Component({
  selector: 'nucleo-cambiar-password-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './cambiar-password-form.component.html',
  styleUrl: './cambiar-password-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarPasswordFormComponent {
  @Output() guardar = new EventEmitter<CambiarPasswordFormValue>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected readonly fields: DynamicFormField[] = [
    { name: 'password_actual', label: 'Contraseña actual', type: 'password', required: true },
    {
      name: 'password',
      label: 'Nueva contraseña',
      type: 'password',
      required: true,
      validators: [Validators.minLength(8)],
    },
    { name: 'password_confirmation', label: 'Confirmar nueva contraseña', type: 'password', required: true },
  ];

  protected readonly error = signal<string | null>(null);

  onSubmit(value: Record<string, unknown>): void {
    const password = value['password'] as string;
    const confirmacion = value['password_confirmation'] as string;

    if (password !== confirmacion) {
      this.error.set('Las contraseñas no coinciden.');

      return;
    }

    this.error.set(null);
    this.guardar.emit({
      password_actual: value['password_actual'] as string,
      password,
      password_confirmation: confirmacion,
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
