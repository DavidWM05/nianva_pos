import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';

import { CategoriaFormComponent } from '../../categoria-form/categoria-form.component';
import { CategoriaFormPayload, CategoriaService } from '../../categoria.service';

/**
 * Vista dedicada, no modal (ver el reporte del punto 1 de Fase B):
 * categoria es una entidad raiz. Mismo patron que ProductoCrearComponent/
 * ClienteCrearComponent.
 */
@Component({
  selector: 'nucleo-categoria-crear',
  standalone: true,
  imports: [RouterLink, CategoriaFormComponent],
  templateUrl: './categoria-crear.component.html',
  styleUrl: './categoria-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriaCrearComponent {
  private readonly categoriaService = inject(CategoriaService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(CategoriaFormComponent) private formulario?: CategoriaFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: CategoriaFormPayload): void {
    this.guardando.set(true);

    this.categoriaService.crear(payload).subscribe({
      next: (categoria) => {
        this.guardando.set(false);
        this.toast.success('Categoría creada.');
        this.router.navigate(['/inventario/categorias', categoria.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear la categoría.');
        }
      },
    });
  }
}
