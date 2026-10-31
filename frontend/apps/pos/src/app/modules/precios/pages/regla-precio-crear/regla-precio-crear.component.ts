import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';

import { ReglaPrecioFormComponent } from '../../regla-precio-form/regla-precio-form.component';
import { ReglaPrecioFormPayload, ReglaPrecioService } from '../../regla-precio.service';

/**
 * Vista dedicada, no modal (ver el reporte del punto 1): regla de precio
 * es una entidad raiz. Mismo patron que ProductoCrearComponent/
 * ClienteCrearComponent.
 */
@Component({
  selector: 'nucleo-regla-precio-crear',
  standalone: true,
  imports: [RouterLink, ReglaPrecioFormComponent],
  templateUrl: './regla-precio-crear.component.html',
  styleUrl: './regla-precio-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReglaPrecioCrearComponent {
  private readonly reglaPrecioService = inject(ReglaPrecioService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(ReglaPrecioFormComponent) private formulario?: ReglaPrecioFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: ReglaPrecioFormPayload): void {
    this.guardando.set(true);

    this.reglaPrecioService.crear(payload).subscribe({
      next: (regla) => {
        this.guardando.set(false);
        this.toast.success('Regla de precio creada.');
        this.router.navigate(['/precios/reglas', regla.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear la regla de precio.');
        }
      },
    });
  }
}
