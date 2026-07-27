import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'nucleo-login',
  standalone: true,
  imports: [DynamicFormComponent, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected readonly fields: DynamicFormField[] = [
    { name: 'correo', label: 'Correo', type: 'text', required: true, validators: [Validators.email], maxLength: 150 },
    { name: 'password', label: 'Contraseña', type: 'password', required: true },
  ];

  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);

  onSubmit(value: Record<string, unknown>): void {
    this.enviando.set(true);
    this.errorGeneral.set(null);

    this.authService.login(value['correo'] as string, value['password'] as string).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);

        if (respuesta.two_factor_required) {
          this.router.navigate(['/two-factor/verify']);

          return;
        }

        this.authState.setUsuario(respuesta.user ?? null);
        this.router.navigateByUrl('/');
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.manejarError(error);
      },
    });
  }

  private manejarError(error: HttpErrorResponse): void {
    if (error.status === 422 && error.error?.errors) {
      this.formComponent.setServerErrors(error.error.errors);

      return;
    }

    if (error.status === 429) {
      this.errorGeneral.set('Demasiados intentos. Espera un minuto antes de volver a intentar.');

      return;
    }

    this.errorGeneral.set('Ocurrio un error inesperado. Intenta de nuevo.');
  }
}
