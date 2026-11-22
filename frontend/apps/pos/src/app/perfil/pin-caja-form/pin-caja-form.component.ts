import { ChangeDetectionStrategy, Component, Injector, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApiService } from '@nianva/domain-sesion';
import { BtnEnviarComponent, CampoComponent, InputPasswordComponent, InputPinComponent, aplicarErroresServidor } from '@nianva/ui-forms';
import { FormActionsComponent } from '@nianva/ui-layout';
import { ToastService } from '@nianva/ui-shared';

/**
 * Alta o cambio del PIN de caja propio (SEG-12): 4 a 6 digitos, con la contrasena actual. Con el
 * PIN se desbloquea la terminal y, si el rol lo permite, se autoriza como supervisor (SEG-05). El
 * servidor rechaza secuencias y repeticiones; el mensaje va a su campo.
 */
@Component({
  selector: 'nucleo-pin-caja-form',
  standalone: true,
  imports: [BtnEnviarComponent, CampoComponent, FormActionsComponent, InputPasswordComponent, InputPinComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="guardar()">
      <!-- "Tu contraseña": Preferencias ya tiene un "Contraseña actual" en el formulario de cambiarla. -->
      <ui-campo etiqueta="Tu contraseña" [requerido]="true">
        <ui-input-password formControlName="password_actual" />
      </ui-campo>
      <ui-campo etiqueta="Nuevo PIN de caja" ayuda="De 4 a 6 dígitos, sin secuencias ni repeticiones." [requerido]="true">
        <ui-input-pin formControlName="pin" [longitud]="6" />
      </ui-campo>
      <ui-form-actions>
        <ui-btn-enviar etiqueta="Guardar PIN" [enviando]="enviando()" />
      </ui-form-actions>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinCajaFormComponent {
  // Se pide al guardar: el formulario vive en Preferencias, que se arma sin cliente HTTP propio.
  private readonly injector = inject(Injector);
  private readonly toast = inject(ToastService);

  protected readonly enviando = signal(false);
  protected readonly form = new FormGroup({
    password_actual: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    pin: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{4,6}$/)] }),
  });

  protected guardar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    const { password_actual, pin } = this.form.getRawValue();
    this.enviando.set(true);
    this.injector.get(AuthApiService).guardarPinCaja(password_actual, pin).subscribe({
      next: () => {
        this.enviando.set(false);
        this.form.reset();
        this.toast.success('Tu PIN de caja quedó guardado.', 'PIN de caja');
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        aplicarErroresServidor(this.form, error);
      },
    });
  }
}
