import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';

import { AuthService } from '../../auth.service';

/**
 * Recibe token+correo por query params (ver ResetPasswordNotification del
 * backend: el link del correo apunta aqui). password_confirmation se
 * valida con un validador cruzado simple (no forma parte de
 * DynamicFormField todavia -- se valida a mano en onSubmit en vez de
 * agregarle esa complejidad al form builder generico por un solo caso de
 * uso).
 */
@Component({
  selector: 'nucleo-reset-password',
  standalone: true,
  imports: [DynamicFormComponent, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected readonly fields: DynamicFormField[] = [
    { name: 'password', label: 'Nueva contraseña', type: 'password', required: true, validators: [Validators.minLength(8)] },
    { name: 'password_confirmation', label: 'Confirmar contraseña', type: 'password', required: true },
  ];

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  onSubmit(value: Record<string, unknown>): void {
    const password = value['password'] as string;
    const confirmacion = value['password_confirmation'] as string;

    if (password !== confirmacion) {
      this.error.set('Las contraseñas no coinciden.');

      return;
    }

    const correo = this.route.snapshot.queryParamMap.get('correo');
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!correo || !token) {
      this.error.set('El enlace no es válido. Solicita uno nuevo.');

      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.authService
      .resetPassword({ correo, token, password, password_confirmation: confirmacion })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.enviando.set(false);

          if (error.status === 422 && error.error?.errors) {
            this.formComponent.setServerErrors(error.error.errors);

            return;
          }

          this.error.set('No se pudo restablecer la contraseña. El enlace puede haber expirado.');
        },
      });
  }
}
