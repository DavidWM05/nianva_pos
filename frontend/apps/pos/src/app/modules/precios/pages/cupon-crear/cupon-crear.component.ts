import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';

import { CuponFormComponent } from '../../cupon-form/cupon-form.component';
import { CuponFormPayload, CuponService } from '../../cupon.service';

/**
 * Vista dedicada, no modal (ver el reporte del punto 1): cupon es una
 * entidad raiz. Mismo patron que ReglaPrecioCrearComponent.
 */
@Component({
  selector: 'nucleo-cupon-crear',
  standalone: true,
  imports: [RouterLink, CuponFormComponent],
  templateUrl: './cupon-crear.component.html',
  styleUrl: './cupon-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuponCrearComponent {
  private readonly cuponService = inject(CuponService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(CuponFormComponent) private formulario?: CuponFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: CuponFormPayload): void {
    this.guardando.set(true);

    this.cuponService.crear(payload).subscribe({
      next: (cupon) => {
        this.guardando.set(false);
        this.toast.success('Cupón creado.');
        this.router.navigate(['/precios/cupones', cupon.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear el cupón.');
        }
      },
    });
  }
}
