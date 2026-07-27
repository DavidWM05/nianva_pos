import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { TwoFactorCodeInputComponent } from '../../../../auth/two-factor-code-input/two-factor-code-input.component';
import { UsuarioFormComponent } from '../../usuario-form/usuario-form.component';
import { UsuarioAdminService, UsuarioFormPayload } from '../../usuario-admin.service';
import { UsuarioAdmin } from '../../usuario.types';

/**
 * Vista de registro de Usuario -- General (formulario, `readonly` sin
 * permiso de editar) + Auditoria (@defer on viewport). Mismo patron que
 * ClienteDetalleComponent.
 *
 * "Desactivar 2FA de este usuario" reemplaza el autoservicio que existia
 * en el perfil de Preferencias (ver el reporte): dos-factor.reciente en el
 * backend exige el TOTP de quien ejecuta la accion (el admin autenticado
 * -- ver authState), no el del usuario objetivo, asi que el paso de
 * confirmacion reutiliza TwoFactorCodeInputComponent contra la CUENTA DEL
 * ADMIN, igual que el flujo (retirado) de auto-desactivacion.
 */
@Component({
  selector: 'nucleo-usuario-detalle',
  standalone: true,
  imports: [RecordTabsComponent, UsuarioFormComponent, AuditLogViewerComponent, TwoFactorCodeInputComponent, Button],
  templateUrl: './usuario-detalle.component.html',
  styleUrl: './usuario-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly usuarioService = inject(UsuarioAdminService);
  private readonly toast = inject(ToastService);
  protected readonly authState = inject(AuthStateService);

  @ViewChild(UsuarioFormComponent) private formulario?: UsuarioFormComponent;
  @ViewChild(TwoFactorCodeInputComponent) private codeInput?: TwoFactorCodeInputComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-user' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly usuario = signal<UsuarioAdmin | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  protected readonly confirmandoDesactivar2fa = signal(false);
  protected readonly enviandoDesactivar2fa = signal(false);
  protected readonly errorCodigo2fa = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.usuarioService.obtener(id).subscribe(({ usuario, permisos }) => {
      this.usuario.set(usuario);
      this.puedeEditar.set(permisos.editar);
      this.cargando.set(false);
    });
  }

  onGuardar(payload: UsuarioFormPayload): void {
    const usuario = this.usuario();
    if (!usuario) {
      return;
    }

    this.guardando.set(true);

    this.usuarioService.actualizar(usuario.id, payload).subscribe({
      next: (actualizado) => {
        this.usuario.set(actualizado);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar el usuario.');
        }
      },
    });
  }

  iniciarDesactivar2fa(): void {
    this.errorCodigo2fa.set(null);

    if (this.authState.usuario()?.dos_factor_confirmado) {
      this.confirmandoDesactivar2fa.set(true);

      return;
    }

    this.enviarDesactivar2fa();
  }

  cancelarDesactivar2fa(): void {
    this.confirmandoDesactivar2fa.set(false);
    this.errorCodigo2fa.set(null);
  }

  onCodigoDesactivar2fa(code: string): void {
    this.enviarDesactivar2fa(code);
  }

  private enviarDesactivar2fa(code?: string): void {
    const usuario = this.usuario();
    if (!usuario) {
      return;
    }

    this.enviandoDesactivar2fa.set(true);

    this.usuarioService.desactivarDosFactor(usuario.id, code).subscribe({
      next: (actualizado) => {
        this.usuario.set(actualizado);
        this.enviandoDesactivar2fa.set(false);
        this.confirmandoDesactivar2fa.set(false);
        this.toast.success('Se desactivó la verificación en dos pasos de este usuario.');
      },
      error: (error: HttpErrorResponse) => {
        this.enviandoDesactivar2fa.set(false);

        if (this.confirmandoDesactivar2fa()) {
          this.errorCodigo2fa.set('Código inválido.');
          this.codeInput?.limpiar();

          return;
        }

        this.toast.error(
          error.status === 403
            ? 'La verificación en dos pasos es obligatoria para el rol de este usuario.'
            : 'No se pudo desactivar la verificación en dos pasos.',
        );
      },
    });
  }
}
