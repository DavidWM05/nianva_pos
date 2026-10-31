import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';
import { TwoFactorCodeInputComponent } from '../../two-factor-code-input/two-factor-code-input.component';

/**
 * Segundo paso del login cuando el usuario ya tiene 2FA confirmado (ver
 * AuthController::login() del backend: la sesion NO se establece hasta
 * que este paso se completa). Si no hay un login pendiente (se entro
 * directo a esta URL, o ya expiro), el backend responde 419 y se manda
 * de vuelta a /login.
 */
@Component({
  selector: 'nucleo-two-factor-verify',
  standalone: true,
  imports: [TwoFactorCodeInputComponent],
  templateUrl: './two-factor-verify.component.html',
  styleUrl: './two-factor-verify.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorVerifyComponent {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  @ViewChild(TwoFactorCodeInputComponent) private codeInput!: TwoFactorCodeInputComponent;

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  onCodeSubmit(code: string): void {
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

        this.error.set('Código inválido.');
        this.codeInput.limpiar();
      },
    });
  }
}
