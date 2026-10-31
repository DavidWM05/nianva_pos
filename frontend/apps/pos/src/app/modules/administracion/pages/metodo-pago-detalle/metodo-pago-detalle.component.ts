import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nianva/ui-shared';

import { MetodoPagoFormComponent } from '../../metodo-pago-form/metodo-pago-form.component';
import { MetodoPagoAdminService, MetodoPagoFormPayload } from '../../metodo-pago-admin.service';
import { MetodoPagoAdmin } from '../../metodo-pago.types';

/**
 * Vista de registro de Metodo de pago -- General (formulario, `readonly`
 * si falta el permiso de editar O si la fila es del catalogo global,
 * ver el reporte de Fase C) + Auditoria (@defer on viewport).
 */
@Component({
  selector: 'nucleo-metodo-pago-detalle',
  standalone: true,
  imports: [RecordTabsComponent, MetodoPagoFormComponent, AuditLogViewerComponent],
  templateUrl: './metodo-pago-detalle.component.html',
  styleUrl: './metodo-pago-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetodoPagoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly metodoPagoService = inject(MetodoPagoAdminService);
  private readonly toast = inject(ToastService);

  @ViewChild(MetodoPagoFormComponent) private formulario?: MetodoPagoFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-wallet' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly metodoPago = signal<MetodoPagoAdmin | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.metodoPagoService.obtener(id).subscribe(({ metodoPago, permisos }) => {
      this.metodoPago.set(metodoPago);
      this.puedeEditar.set(permisos.editar);
      this.cargando.set(false);
    });
  }

  onGuardar(payload: MetodoPagoFormPayload): void {
    const metodoPago = this.metodoPago();
    if (!metodoPago) {
      return;
    }

    this.guardando.set(true);

    this.metodoPagoService.actualizar(metodoPago.id, payload).subscribe({
      next: (actualizado) => {
        this.metodoPago.set(actualizado);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar el método de pago.');
        }
      },
    });
  }
}
