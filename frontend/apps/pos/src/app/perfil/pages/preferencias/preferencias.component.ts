import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ToastService } from '@nianva/ui-shared';

import { AuthStateService } from '../../../auth/auth-state.service';
import { TwoFactorCodeInputComponent } from '../../../auth/two-factor-code-input/two-factor-code-input.component';
import { CambiarPasswordFormComponent, CambiarPasswordFormValue } from '../../cambiar-password-form/cambiar-password-form.component';
import { DispositivosConfiablesListComponent } from '../../dispositivos-confiables-list/dispositivos-confiables-list.component';
import { SeguridadService } from '../../seguridad.service';
import { DispositivoConfiable } from '../../seguridad.types';

/**
 * Preferencias personales -- antes "Seguridad" (ver el reporte de
 * reorganizacion del sidebar): cualquier usuario autenticado, sin permiso
 * especial. Mis dispositivos confiables + cambiar mi propia contraseña.
 *
 * Ya NO vive aqui: desactivar 2FA (dejo de ser autoservicio, se movio a
 * Usuarios/administracion, ver UsuarioDetalleComponent) ni
 * dias_dispositivo_normal/admin (politica de toda la empresa, se movio al
 * tab Empresa de Configuración, ver ConfiguracionComponent).
 */
@Component({
  selector: 'nucleo-preferencias',
  standalone: true,
  imports: [DispositivosConfiablesListComponent, CambiarPasswordFormComponent, TwoFactorCodeInputComponent],
  templateUrl: './preferencias.component.html',
  styleUrl: './preferencias.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferenciasComponent implements OnInit {
  private readonly seguridadService = inject(SeguridadService);
  private readonly toast = inject(ToastService);
  protected readonly authState = inject(AuthStateService);

  @ViewChild(CambiarPasswordFormComponent) private formularioPassword?: CambiarPasswordFormComponent;
  @ViewChild(TwoFactorCodeInputComponent) private codeInput?: TwoFactorCodeInputComponent;

  protected readonly dispositivos = signal<DispositivoConfiable[]>([]);
  protected readonly cargandoDispositivos = signal(true);

  /** Los datos del formulario quedan aqui mientras se pide el TOTP -- ver onGuardarPassword. */
  protected readonly pendientePassword = signal<CambiarPasswordFormValue | null>(null);
  protected readonly enviandoPassword = signal(false);
  protected readonly errorCodigo = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarDispositivos();
  }

  private cargarDispositivos(): void {
    this.cargandoDispositivos.set(true);
    this.seguridadService.listarDispositivosConfiables().subscribe({
      next: (dispositivos) => {
        this.dispositivos.set(dispositivos);
        this.cargandoDispositivos.set(false);
      },
      error: () => this.cargandoDispositivos.set(false),
    });
  }

  onRevocarDispositivo(id: number): void {
    this.seguridadService.revocarDispositivo(id).subscribe(() => this.cargarDispositivos());
  }

  onRevocarTodosLosDispositivos(): void {
    this.seguridadService.revocarTodosLosDispositivos().subscribe(() => this.cargarDispositivos());
  }

  /**
   * Si la cuenta tiene 2FA confirmado, dos-factor.reciente (backend) exige
   * el TOTP de nuevo sin importar si el dispositivo actual es uno ya
   * confiado -- se pide aqui antes de llamar al servicio. Si no, se manda
   * directo (la ruta no exige `code` en ese caso, ver RequiereDosFactorReciente).
   */
  onGuardarPassword(payload: CambiarPasswordFormValue): void {
    if (this.authState.usuario()?.dos_factor_confirmado) {
      this.pendientePassword.set(payload);
      this.errorCodigo.set(null);

      return;
    }

    this.enviarCambioPassword(payload);
  }

  cancelarCodigo(): void {
    this.pendientePassword.set(null);
    this.errorCodigo.set(null);
  }

  onCodigoPassword(code: string): void {
    const pendiente = this.pendientePassword();
    if (!pendiente) {
      return;
    }

    this.enviarCambioPassword({ ...pendiente, code });
  }

  private enviarCambioPassword(payload: CambiarPasswordFormValue & { code?: string }): void {
    this.enviandoPassword.set(true);

    this.seguridadService.cambiarPassword(payload).subscribe({
      next: () => {
        this.enviandoPassword.set(false);
        this.pendientePassword.set(null);
        this.errorCodigo.set(null);
        this.toast.success('Contraseña actualizada.');
      },
      error: (error: HttpErrorResponse) => this.manejarErrorCambioPassword(error),
    });
  }

  /**
   * Un codigo TOTP invalido/faltante llega en errors.code -- eso SI se
   * queda en el paso de confirmacion (limpia el campo, pide otro codigo).
   * Cualquier otro 422 (ej. password_actual incorrecta) es del formulario
   * de contraseña, no del codigo -- el formulario esta siempre montado (ver
   * la plantilla), asi que sus errores se pueden reflejar ahi mismo en vez
   * de dejar al usuario atascado frente al campo de codigo.
   */
  private manejarErrorCambioPassword(error: HttpErrorResponse): void {
    this.enviandoPassword.set(false);

    if (this.pendientePassword() && (error.status === 403 || error.error?.errors?.code)) {
      this.errorCodigo.set(error.status === 403 ? 'La verificación en dos pasos es obligatoria.' : 'Código inválido.');
      this.codeInput?.limpiar();

      return;
    }

    this.pendientePassword.set(null);

    if (error.status === 422 && error.error?.errors) {
      this.formularioPassword?.setServerErrors(error.error.errors);
    } else {
      this.toast.error('No se pudo actualizar la contraseña.');
    }
  }
}
