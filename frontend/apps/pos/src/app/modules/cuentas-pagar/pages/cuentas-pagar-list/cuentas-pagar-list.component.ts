import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent, StatusBadgeComponent } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Subject, debounceTime } from 'rxjs';

import { CuentaPagarService } from '../../cuenta-pagar.service';
import { CuentaPagar, EstadoCuentaPagar } from '../../cuenta-pagar.types';

const ESTADOS: { label: string; value: EstadoCuentaPagar | null }[] = [
  { label: 'Todas', value: null },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Pagadas', value: 'pagada' },
  { label: 'Anuladas', value: 'anulada' },
];

@Component({
  selector: 'nucleo-cuentas-pagar-list',
  standalone: true,
  imports: [DatePipe, FormsModule, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText, Select],
  templateUrl: './cuentas-pagar-list.component.html',
  styleUrl: './cuentas-pagar-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasPagarListComponent {
  private readonly cuentaPagarService = inject(CuentaPagarService);
  private readonly router = inject(Router);

  protected readonly estados = ESTADOS;

  protected readonly columns: DataTableColumn[] = [
    { field: 'proveedor', header: 'Proveedor' },
    { field: 'monto_total', header: 'Monto total' },
    { field: 'saldo_pendiente', header: 'Saldo pendiente' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha_vencimiento', header: 'Vence', sortable: true },
    { field: 'acciones', header: '' },
  ];

  protected readonly cuentas = signal<CuentaPagar[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly estadoFiltro = signal<EstadoCuentaPagar | null>(null);
  protected readonly proveedorFiltro = signal('');

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly proveedorSubject = new Subject<string>();

  constructor() {
    this.proveedorSubject.pipe(debounceTime(300)).subscribe((texto) => {
      this.proveedorFiltro.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onProveedorInput(texto: string): void {
    this.proveedorSubject.next(texto);
  }

  onEstadoCambio(estado: EstadoCuentaPagar | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(cuenta: CuentaPagar): void {
    this.router.navigate(['/cuentas-pagar', cuenta.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.cuentaPagarService.listar(evento, { proveedorNombre: this.proveedorFiltro(), estado: this.estadoFiltro() }).subscribe({
      next: (respuesta) => {
        this.cuentas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
