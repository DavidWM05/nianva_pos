import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent, StatusBadgeComponent } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Subject, debounceTime } from 'rxjs';

import { CuentaCobrarService } from '../../cuenta-cobrar.service';
import { CuentaCobrar, EstadoCuentaCobrar } from '../../cuenta-cobrar.types';

const ESTADOS: { label: string; value: EstadoCuentaCobrar | null }[] = [
  { label: 'Todas', value: null },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Pagadas', value: 'pagada' },
  { label: 'Anuladas', value: 'anulada' },
];

@Component({
  selector: 'nucleo-cuentas-cobrar-list',
  standalone: true,
  imports: [DatePipe, FormsModule, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, Checkbox, InputText, Select],
  templateUrl: './cuentas-cobrar-list.component.html',
  styleUrl: './cuentas-cobrar-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasCobrarListComponent {
  private readonly cuentaCobrarService = inject(CuentaCobrarService);
  private readonly router = inject(Router);

  protected readonly estados = ESTADOS;

  protected readonly columns: DataTableColumn[] = [
    { field: 'cliente', header: 'Cliente' },
    { field: 'monto_total', header: 'Monto total' },
    { field: 'saldo_pendiente', header: 'Saldo pendiente' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha_vencimiento', header: 'Vence', sortable: true },
    { field: 'acciones', header: '' },
  ];

  protected readonly cuentas = signal<CuentaCobrar[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly estadoFiltro = signal<EstadoCuentaCobrar | null>(null);
  protected readonly clienteFiltro = signal('');
  protected readonly soloVencidas = signal(false);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly clienteSubject = new Subject<string>();

  constructor() {
    this.clienteSubject.pipe(debounceTime(300)).subscribe((texto) => {
      this.clienteFiltro.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onClienteInput(texto: string): void {
    this.clienteSubject.next(texto);
  }

  onEstadoCambio(estado: EstadoCuentaCobrar | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onVencidasCambio(vencidas: boolean): void {
    this.soloVencidas.set(vencidas);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(cuenta: CuentaCobrar): void {
    this.router.navigate(['/cuentas-cobrar', cuenta.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.cuentaCobrarService
      .listar(evento, { clienteNombre: this.clienteFiltro(), estado: this.estadoFiltro(), vencidas: this.soloVencidas() })
      .subscribe({
        next: (respuesta) => {
          this.cuentas.set(respuesta.data);
          this.total.set(respuesta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
