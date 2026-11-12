import { ChangeDetectionStrategy, Component, InjectionToken, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { map } from 'rxjs';
import * as QRCode from 'qrcode';
import { AlertComponent, SkeletonComponent, conUmbral } from '@nianva/ui-feedback';
import { CampoComponent, InputCodigoComponent } from '@nianva/ui-forms';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';

/** Convierte la URI otpauth:// en la imagen del QR. Un token para poder simularlo en tests. */
export const GENERAR_QR = new InjectionToken<(otpauthUrl: string) => Promise<string>>('GENERAR_QR', {
  factory: () => (otpauthUrl) => QRCode.toDataURL(otpauthUrl),
});

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
  imports: [ReactiveFormsModule, MatButton, AlertComponent, CampoComponent, InputCodigoComponent, SkeletonComponent],
  templateUrl: './two-factor-setup.component.html',
  styleUrl: './two-factor-setup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorSetupComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly generarQr = inject(GENERAR_QR);

  protected readonly cargando = signal(true);
  protected readonly qrDataUrl = signal<string | null>(null);
  protected readonly secret = signal<string | null>(null);
  protected readonly code = new FormControl('', { nonNullable: true });
  /** Señal del valor: con OnPush, un setValue desde código (limpiar, un rechazo) también refresca el botón. */
  protected readonly codigoCompleto = toSignal(this.code.valueChanges.pipe(map((valor) => valor.length === 6)), {
    initialValue: false,
  });
  /** Fallo al generar el QR: se muestra con "Reintentar" y sin formulario (UI-18). */
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly indicadorEnvio = conUmbral(this.enviando);
  protected readonly recoveryCodes = signal<string[] | null>(null);

  ngOnInit(): void {
    this.cargarQr();
  }

  cargarQr(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.authService.getTwoFactorSetup().subscribe({
      next: async ({ secret, otpauth_url: otpauthUrl }) => {
        this.secret.set(secret);
        this.qrDataUrl.set(await this.generarQr(otpauthUrl));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudo generar el código QR.');
      },
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.enviando.set(true);

    this.authService.confirmTwoFactor(this.code.value).subscribe({
      next: ({ user, recovery_codes: codigos }) => {
        this.enviando.set(false);
        this.authState.setUsuario(user);
        this.recoveryCodes.set(codigos);
      },
      error: () => {
        this.enviando.set(false);
        this.code.setValue('');
        // Error del campo: ui-campo lo muestra bajo el codigo y lo asocia (aria-describedby).
        this.code.setErrors({ servidor: 'Código inválido.' });
        this.code.markAsTouched();
      },
    });
  }

  continuar(): void {
    this.router.navigateByUrl('/');
  }
}
