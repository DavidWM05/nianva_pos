import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';

import { PlanPagoService, PlanesPagoPermisos } from '../../plan-pago.service';
import { PlanPago } from '../../plan-pago.types';

const PERMISOS_VACIOS: PlanesPagoPermisos = { crear: false };

@Component({
  selector: 'nucleo-planes-pago-list',
  standalone: true,
  imports: [DatePipe, RouterLink, DataTableComponent, DataTableCellDirective, Button],
  templateUrl: './planes-pago-list.component.html',
  styleUrl: './planes-pago-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanesPagoListComponent {
  private readonly planPagoService = inject(PlanPagoService);
  private readonly router = inject(Router);

  protected readonly columns: DataTableColumn[] = [
    { field: 'cliente', header: 'Cliente' },
    { field: 'monto_total', header: 'Monto total' },
    { field: 'numero_cuotas', header: 'Cuotas' },
    { field: 'periodicidad', header: 'Periodicidad' },
    { field: 'fecha_inicio', header: 'Fecha inicio', sortable: true },
    { field: 'acciones', header: '' },
  ];

  protected readonly planes = signal<PlanPago[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<PlanesPagoPermisos>(PERMISOS_VACIOS);

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.loading.set(true);

    this.planPagoService.listar(evento).subscribe({
      next: (respuesta) => {
        this.planes.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  irADetalle(plan: PlanPago): void {
    this.router.navigate(['/ventas-plazos', plan.id]);
  }
}
