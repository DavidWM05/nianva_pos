import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';

import { DepartamentoFormComponent } from '../../departamento-form/departamento-form.component';
import { DepartamentoFormPayload, DepartamentoService } from '../../departamento.service';

/**
 * Vista dedicada, no modal (ver el reporte del punto 1 de Fase B):
 * departamento es una entidad raiz. Mismo patron que CategoriaCrearComponent.
 */
@Component({
  selector: 'nucleo-departamento-crear',
  standalone: true,
  imports: [RouterLink, DepartamentoFormComponent],
  templateUrl: './departamento-crear.component.html',
  styleUrl: './departamento-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentoCrearComponent {
  private readonly departamentoService = inject(DepartamentoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(DepartamentoFormComponent) private formulario?: DepartamentoFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: DepartamentoFormPayload): void {
    this.guardando.set(true);

    this.departamentoService.crear(payload).subscribe({
      next: (departamento) => {
        this.guardando.set(false);
        this.toast.success('Departamento creado.');
        this.router.navigate(['/inventario/departamentos', departamento.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear el departamento.');
        }
      },
    });
  }
}
