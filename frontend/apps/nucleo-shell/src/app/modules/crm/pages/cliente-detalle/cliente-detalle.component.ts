import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nucleo/ui-shared';

import { ClienteFormComponent } from '../../cliente-form/cliente-form.component';
import { ClienteFormPayload, ClienteService } from '../../cliente.service';
import { Cliente, VentaResumen } from '../../cliente.types';

/**
 * Vista de registro del modulo CRM -- General (formulario editable),
 * Historial de ventas (lectura), Auditoria (@defer on viewport, mismo
 * patron ya validado en el demo de scaffolding).
 */
@Component({
  selector: 'nucleo-cliente-detalle',
  standalone: true,
  imports: [DatePipe, RecordTabsComponent, ClienteFormComponent, AuditLogViewerComponent],
  templateUrl: './cliente-detalle.component.html',
  styleUrl: './cliente-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clienteService = inject(ClienteService);
  private readonly toast = inject(ToastService);

  @ViewChild(ClienteFormComponent) private formulario?: ClienteFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-user' },
    { label: 'Historial de ventas', icon: 'pi pi-shopping-cart' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cliente = signal<Cliente | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  protected readonly ventas = signal<VentaResumen[]>([]);
  protected readonly cargandoVentas = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.clienteService.obtener(id).subscribe(({ cliente, permisos }) => {
      this.cliente.set(cliente);
      this.puedeEditar.set(permisos.editar);
      this.cargando.set(false);
    });

    this.clienteService.ventas(id).subscribe({
      next: (ventas) => {
        this.ventas.set(ventas);
        this.cargandoVentas.set(false);
      },
      error: () => this.cargandoVentas.set(false),
    });
  }

  onGuardar(payload: ClienteFormPayload): void {
    const cliente = this.cliente();
    if (!cliente) {
      return;
    }

    this.guardando.set(true);

    this.clienteService.actualizar(cliente.id, payload).subscribe({
      next: (actualizado) => {
        this.cliente.set(actualizado);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar el cliente.');
        }
      },
    });
  }
}
