import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';

import { MetodoPagoFormComponent } from '../../metodo-pago-form/metodo-pago-form.component';
import { MetodoPagoAdminService, MetodoPagoFormPayload } from '../../metodo-pago-admin.service';

/**
 * Vista dedicada, no modal (ver el reporte de Fase B/C): metodo de pago
 * es una entidad raiz. Siempre se crea con el tenant_id del usuario
 * actual (ver MetodoPagoController::store()), nunca como fila global.
 */
@Component({
  selector: 'nucleo-metodo-pago-crear',
  standalone: true,
  imports: [RouterLink, MetodoPagoFormComponent],
  templateUrl: './metodo-pago-crear.component.html',
  styleUrl: './metodo-pago-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetodoPagoCrearComponent {
  private readonly metodoPagoService = inject(MetodoPagoAdminService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(MetodoPagoFormComponent) private formulario?: MetodoPagoFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: MetodoPagoFormPayload): void {
    this.guardando.set(true);

    this.metodoPagoService.crear(payload).subscribe({
      next: (metodoPago) => {
        this.guardando.set(false);
        this.toast.success('Método de pago creado.');
        this.router.navigate(['/metodos-pago', metodoPago.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear el método de pago.');
        }
      },
    });
  }
}
