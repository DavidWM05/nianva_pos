import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent, StatusBadgeComponent } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';

import { PrestamoService } from '../../prestamo.service';
import { Prestamo } from '../../prestamo.types';

@Component({
  selector: 'nucleo-prestamos-list',
  standalone: true,
  imports: [DatePipe, RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button],
  templateUrl: './prestamos-list.component.html',
  styleUrl: './prestamos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrestamosListComponent {
  private readonly prestamoService = inject(PrestamoService);
  private readonly router = inject(Router);

  protected readonly columns: DataTableColumn[] = [
    { field: 'referencia', header: 'Referencia' },
    { field: 'monto', header: 'Monto' },
    { field: 'monto_a_pagar', header: 'A pagar (con interés)' },
    { field: 'saldo_pendiente', header: 'Saldo pendiente' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha_prestamo', header: 'Fecha', sortable: true },
    { field: 'acciones', header: '' },
  ];

  protected readonly prestamos = signal<Prestamo[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(prestamo: Prestamo): void {
    this.router.navigate(['/prestamos', prestamo.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.loading.set(true);

    this.prestamoService.listar(evento).subscribe({
      next: (respuesta) => {
        this.prestamos.set(respuesta.data);
        this.total.set(respuesta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
