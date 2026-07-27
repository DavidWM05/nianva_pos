import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';

import { UsuarioFormComponent } from '../../usuario-form/usuario-form.component';
import { UsuarioAdminService, UsuarioFormPayload } from '../../usuario-admin.service';

/**
 * Vista dedicada, no modal (ver el reporte de Fase B/C): usuario es una
 * entidad raiz. Mismo patron que ClienteCrearComponent.
 */
@Component({
  selector: 'nucleo-usuario-crear',
  standalone: true,
  imports: [RouterLink, UsuarioFormComponent],
  templateUrl: './usuario-crear.component.html',
  styleUrl: './usuario-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioCrearComponent {
  private readonly usuarioService = inject(UsuarioAdminService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(UsuarioFormComponent) private formulario?: UsuarioFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: UsuarioFormPayload): void {
    this.guardando.set(true);

    this.usuarioService.crear(payload).subscribe({
      next: (usuario) => {
        this.guardando.set(false);
        this.toast.success('Usuario creado.');
        this.router.navigate(['/usuarios', usuario.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear el usuario.');
        }
      },
    });
  }
}
