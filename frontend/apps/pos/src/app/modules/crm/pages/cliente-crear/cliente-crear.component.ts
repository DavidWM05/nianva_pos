import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';

import { ClienteFormComponent } from '../../cliente-form/cliente-form.component';
import { ClienteFormPayload, ClienteService } from '../../cliente.service';

/**
 * Vista dedicada, no modal (ver el reporte del punto 1): cliente es una
 * entidad raiz. Al guardar, navega al detalle recien creado (mismo patron
 * que ProductoCrearComponent/ApartadoFormComponent).
 */
@Component({
  selector: 'nucleo-cliente-crear',
  standalone: true,
  imports: [RouterLink, ClienteFormComponent],
  templateUrl: './cliente-crear.component.html',
  styleUrl: './cliente-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteCrearComponent {
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(ClienteFormComponent) private formulario?: ClienteFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: ClienteFormPayload): void {
    this.guardando.set(true);

    this.clienteService.crear(payload).subscribe({
      next: (cliente) => {
        this.guardando.set(false);
        this.toast.success('Cliente creado.');
        this.router.navigate(['/crm/clientes', cliente.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear el cliente.');
        }
      },
    });
  }
}
