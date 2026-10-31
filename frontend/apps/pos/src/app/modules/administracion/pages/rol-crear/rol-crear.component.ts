import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';

import { RolFormComponent } from '../../rol-form/rol-form.component';
import { RolFormPayload, RolService } from '../../rol.service';

/**
 * Vista dedicada, no modal (ver el reporte de Fase B/C): rol es una
 * entidad raiz. Se crea siempre con es_sistema=false, tenant_id del
 * usuario actual (ver RolController::store()).
 */
@Component({
  selector: 'nucleo-rol-crear',
  standalone: true,
  imports: [RouterLink, RolFormComponent],
  templateUrl: './rol-crear.component.html',
  styleUrl: './rol-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolCrearComponent {
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(RolFormComponent) private formulario?: RolFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: RolFormPayload): void {
    this.guardando.set(true);

    this.rolService.crear(payload).subscribe({
      next: (rol) => {
        this.guardando.set(false);
        this.toast.success('Rol creado.');
        this.router.navigate(['/roles', rol.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear el rol.');
        }
      },
    });
  }
}
