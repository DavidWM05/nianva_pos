import {
  CambioListado,
  ColumnaListado,
  FilterBarComponent,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { BotonCrearComponent } from '@nianva/ui-actions';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { DataTableLazyEvent } from '@nianva/ui-shared';

import { PlanPagoService, PlanesPagoPermisos } from '../../plan-pago.service';
import { PlanPago } from '../../plan-pago.types';

const PERMISOS_VACIOS: PlanesPagoPermisos = { crear: false };

type FilaSaldo = PlanPago & { clienteTexto: string };

@Component({
  selector: 'nucleo-planes-pago-list',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PageComponent,
    FilterBarComponent,
    TablaComponent,
    BotonCrearComponent,
  ],
  templateUrl: './planes-pago-list.component.html',
  styleUrl: './planes-pago-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanesPagoListComponent {
  private readonly planPagoService = inject(PlanPagoService);
  private readonly router = inject(Router);

  protected readonly planes = signal<PlanPago[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<PlanesPagoPermisos>(PERMISOS_VACIOS);

  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });

  constructor() {
    this.onLazyLoad(this.ultimoEvento());
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.planPagoService.listar(evento).subscribe({
      next: (respuesta) => {
        this.planes.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
        this.primeraCarga.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.primeraCarga.set(false);
        this.error.set(true);
      },
    });
  }

  irADetalle(plan: PlanPago): void {
    this.router.navigate(['/ventas-plazos', plan.id]);
  }

  protected readonly primeraCarga = signal(true);
  protected readonly error = signal(false);
  protected readonly estado = computed(() =>
    this.primeraCarga() && this.loading()
      ? 'cargando'
      : this.error()
        ? 'error'
        : 'listo',
  );
  protected readonly meta = computed<MetaListado>(() => ({
    total: this.total(),
    page:
      Math.floor(this.ultimoEvento().first / (this.ultimoEvento().rows || 25)) +
      1,
    rows: this.ultimoEvento().rows || 25,
    filtros_aplicados: {},
    permisos: { ...this.permisos() },
  }));
  protected readonly filas = computed<FilaSaldo[]>(() =>
    this.planes().map((fila) => ({
      ...fila,
      clienteTexto: fila.cliente?.nombre ?? 'Sin cliente',
    })),
  );
  protected readonly columnas: ColumnaListado<FilaSaldo>[] = [
    { tipo: 'principal', campo: 'clienteTexto', encabezado: 'Cliente' },
    { tipo: 'dinero', campo: 'monto_total', encabezado: 'Monto total' },
    { tipo: 'cantidad', campo: 'numero_cuotas', encabezado: 'Cuotas' },
    { tipo: 'texto', campo: 'periodicidad', encabezado: 'Periodicidad' },
    {
      tipo: 'fecha',
      campo: 'fecha_inicio',
      encabezado: 'Fecha inicio',
      ordenable: true,
    },
    { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] },
  ];

  reintentar(): void {
    this.onLazyLoad(this.ultimoEvento());
  }

  onCambio(evento: CambioListado): void {
    this.onLazyLoad({
      first: (evento.page - 1) * evento.rows,
      rows: evento.rows,
      sortField: evento.sortField,
      sortOrder:
        evento.sortOrder === 'asc'
          ? 1
          : evento.sortOrder === 'desc'
            ? -1
            : null,
      filters: {},
    });
  }
}
