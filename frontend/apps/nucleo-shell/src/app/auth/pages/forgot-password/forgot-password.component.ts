import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';

import { AuthService } from '../../auth.service';

@Component({
  selector: 'nucleo-forgot-password',
  standalone: true,
  imports: [DynamicFormComponent, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected readonly fields: DynamicFormField[] = [
    { name: 'correo', label: 'Correo', type: 'text', required: true, validators: [Validators.email], maxLength: 150 },
  ];

  protected readonly enviando = signal(false);
  protected readonly status = signal<string | null>(null);

  onSubmit(value: Record<string, unknown>): void {
    this.enviando.set(true);
    this.status.set(null);

    this.authService.requestPasswordReset(value['correo'] as string).subscribe({
      next: ({ status }) => {
        this.enviando.set(false);
        this.status.set(status);
      },
      error: (error) => {
        this.enviando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formComponent.setServerErrors(error.error.errors);
        }
      },
    });
  }
}
