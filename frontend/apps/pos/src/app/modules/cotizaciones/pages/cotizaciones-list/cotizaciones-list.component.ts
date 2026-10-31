import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  StatusBadgeComponent,
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Subject, debounceTime } from 'rxjs';

import { CotizacionesPermisos, CotizacionService } from '../../cotizacion.service';
import { Cotizacion, EstadoCotizacion } from '../../cotizacion.types';

const PERMISOS_VACIOS: CotizacionesPermisos = { crear: false, editar: false, eliminar: false };

const ESTADOS: { label: string; value: EstadoCotizacion | null }[] = [
  { label: 'Todas', value: null },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Convertidas', value: 'convertida' },
  { label: 'Vencidas', value: 'vencida' },
  { label: 'Anuladas', value: 'anulada' },
];

@Component({
  selector: 'nucleo-cotizaciones-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    DataTableComponent,
    DataTableCellDirective,
    StatusBadgeComponent,
    Button,
    InputText,
    Select,
  ],
  templateUrl: './cotizaciones-list.component.html',
  styleUrl: './cotizaciones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizacionesListComponent {
  private readonly cotizacionService = inject(CotizacionService);
  private readonly router = inject(Router);

  protected readonly estados = ESTADOS;

  protected readonly columns: DataTableColumn[] = [
    { field: 'numero_cotizacion', header: 'Número' },
    { field: 'cliente', header: 'Cliente' },
    { field: 'total', header: 'Total' },
    { field: 'created_at', header: 'Creada', sortable: true },
    { field: 'fecha_vencimiento', header: 'Vence' },
    { field: 'estado', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly cotizaciones = signal<Cotizacion[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<CotizacionesPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');
  protected readonly estadoFiltro = signal<EstadoCotizacion | null>(null);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  onEstadoCambio(estado: EstadoCotizacion | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(cotizacion: Cotizacion): void {
    this.router.navigate(['/cotizaciones', cotizacion.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.cotizacionService
      .listar(evento, { numero: this.busqueda(), estado: this.estadoFiltro() ?? undefined })
      .subscribe({
        next: (respuesta) => {
          this.cotizaciones.set(respuesta.data);
          this.total.set(respuesta.total);
          this.permisos.set(respuesta.permisos);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
