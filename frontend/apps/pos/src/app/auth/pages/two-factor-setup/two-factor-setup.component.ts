import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { InputOtp } from 'primeng/inputotp';
import * as QRCode from 'qrcode';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';

/**
 * Configuracion inicial de 2FA -- obligatoria para admin/superadmin (ver
 * authGuard: redirige aqui mientras dos_factor_confirmado sea false).
 * El QR se renderiza del lado del cliente (paquete `qrcode`) a partir de
 * la URI otpauth:// que devuelve el backend -- el secreto nunca sale
 * hacia un servicio externo de imagenes.
 */
@Component({
  selector: 'nucleo-two-factor-setup',
  standalone: true,
  imports: [ReactiveFormsModule, InputOtp, Button],
  templateUrl: './two-factor-setup.component.html',
  styleUrl: './two-factor-setup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorSetupComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly qrDataUrl = signal<string | null>(null);
  protected readonly secret = signal<string | null>(null);
  protected readonly code = new FormControl('', { nonNullable: true });
  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly recoveryCodes = signal<string[] | null>(null);

  ngOnInit(): void {
    this.authService.getTwoFactorSetup().subscribe({
      next: async ({ secret, otpauth_url: otpauthUrl }) => {
        this.secret.set(secret);
        this.qrDataUrl.set(await QRCode.toDataURL(otpauthUrl));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudo generar el codigo QR. Intenta recargar la pagina.');
      },
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.enviando.set(true);
    this.error.set(null);

    this.authService.confirmTwoFactor(this.code.value).subscribe({
      next: ({ user, recovery_codes: codigos }) => {
        this.enviando.set(false);
        this.authState.setUsuario(user);
        this.recoveryCodes.set(codigos);
      },
      error: () => {
        this.enviando.set(false);
        this.error.set('Código inválido.');
        this.code.setValue('');
      },
    });
  }

  continuar(): void {
    this.router.navigateByUrl('/');
  }
}
