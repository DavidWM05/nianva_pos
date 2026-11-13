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

import { RecetaService, RecetasPermisos } from '../../receta.service';
import { Receta } from '../../receta.types';

const PERMISOS_VACIOS: RecetasPermisos = { crear: false };

/** Sin recetasShow()/recetasUpdate() -- solo lista + alta (pages/receta-form). */
@Component({
  selector: 'nucleo-recetas-list',
  standalone: true,
  imports: [
    FilterBarComponent,
    TablaComponent,
    BotonCrearComponent,
    PageComponent,
    PageHeaderComponent,
  ],
  templateUrl: './recetas-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecetasListComponent {
  private readonly recetaService = inject(RecetaService);

  protected readonly columns: ColumnaListado<
    Receta & { varianteTexto: string; ingredientesTotal: number }
  >[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre' },
    { tipo: 'texto', campo: 'varianteTexto', encabezado: 'Variante' },
    { tipo: 'cantidad', campo: 'rendimiento', encabezado: 'Rendimiento' },
    {
      tipo: 'cantidad',
      campo: 'ingredientesTotal',
      encabezado: 'Ingredientes',
    },
  ];

  protected readonly recetas = signal<Receta[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<RecetasPermisos>(PERMISOS_VACIOS);

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

    this.recetaService.listar(evento).subscribe({
      next: (respuesta) => {
        this.recetas.set(respuesta.data);
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
    this.recetas().map((f) => ({
      ...f,
      varianteTexto: 'Variante #' + f.variante_id,
      ingredientesTotal: f.ingredientes?.length ?? 0,
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
