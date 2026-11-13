import {
  FilterBarComponent,
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';

import { BotonCrearComponent } from '@nianva/ui-actions';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DataTableLazyEvent } from '@nianva/ui-shared';

import {
  TransformacionService,
  TransformacionesPermisos,
} from '../../transformacion.service';
import { TransformacionProducto } from '../../transformacion.types';

const PERMISOS_VACIOS: TransformacionesPermisos = { crear: false };

/** Sin transformacionesShow() -- solo lista + alta (pages/transformacion-form). */
@Component({
  selector: 'nucleo-transformaciones-list',
  standalone: true,
  imports: [
    FilterBarComponent,
    TablaComponent,
    BotonCrearComponent,
    PageComponent,
    PageHeaderComponent,
  ],
  templateUrl: './transformaciones-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransformacionesListComponent {
  private readonly transformacionService = inject(TransformacionService);

  protected readonly columns: ColumnaListado<
    TransformacionProducto & { origenTexto: string; destinoTexto: string }
  >[] = [
    { tipo: 'principal', campo: 'origenTexto', encabezado: 'Origen' },
    {
      tipo: 'cantidad',
      campo: 'cantidad_origen',
      encabezado: 'Cantidad consumida',
    },
    { tipo: 'texto', campo: 'destinoTexto', encabezado: 'Destino' },
    {
      tipo: 'cantidad',
      campo: 'cantidad_destino',
      encabezado: 'Cantidad producida',
    },
    { tipo: 'texto', campo: 'notas', encabezado: 'Notas' },
  ];

  protected readonly transformaciones = signal<TransformacionProducto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos =
    signal<TransformacionesPermisos>(PERMISOS_VACIOS);

  private ultimoEvento: DataTableLazyEvent = {
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  };

  constructor() {
    this.cargar(this.ultimoEvento);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.errorCarga.set(false);
    this.loading.set(true);

    this.transformacionService.listar(evento).subscribe({
      next: (respuesta) => {
        this.transformaciones.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.primeraCarga.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.primeraCarga.set(false);
        this.loading.set(false);
        this.errorCarga.set(true);
      },
    });
  }
  protected readonly primeraCarga = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly estado = computed(() =>
    this.loading() && this.primeraCarga()
      ? 'cargando'
      : this.errorCarga()
        ? 'error'
        : 'listo',
  );
  protected readonly filas = computed(() =>
    this.transformaciones().map((f) => ({
      ...f,
      origenTexto: 'Variante #' + f.variante_origen_id,
      destinoTexto: 'Variante #' + f.variante_destino_id,
    })),
  );
  protected get meta(): MetaListado {
    return {
      total: this.total(),
      page: Math.floor(this.ultimoEvento.first / this.ultimoEvento.rows) + 1,
      rows: this.ultimoEvento.rows,
      filtros_aplicados: {},
      permisos: {},
    };
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
  reintentar(): void {
    this.cargar(this.ultimoEvento);
  }
}
