import { CampoComponent } from '@nianva/ui-forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatInput } from '@angular/material/input';
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
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DataTableLazyEvent } from '@nianva/ui-shared';

import { BUSCADOR_UNIDAD_MEDIDA } from '../../../../core/buscadores-entidad.tokens';
import { InsumoService, InsumosPermisos } from '../../insumo.service';
import { Insumo } from '../../insumo.types';

const PERMISOS_VACIOS: InsumosPermisos = { crear: false };

/** Sin insumosShow()/insumosUpdate() -- el alta vive en un dialogo sobre la misma lista. */
@Component({
  selector: 'nucleo-insumos-list',
  standalone: true,
  imports: [
    CampoComponent,
    MatCheckbox,
    MatInput,
    FilterBarComponent,
    TablaComponent,
    BotonCrearComponent,
    PageComponent,
    PageHeaderComponent,
    FormsModule,
  ],
  templateUrl: './insumos-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsumosListComponent implements OnInit {
  private readonly insumoService = inject(InsumoService);

  protected readonly buscadorUnidadMedida = inject(BUSCADOR_UNIDAD_MEDIDA);

  protected readonly columns: ColumnaListado<
    Insumo & { unidadTexto: string }
  >[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre' },
    { tipo: 'texto', campo: 'sku', encabezado: 'SKU' },
    { tipo: 'texto', campo: 'unidadTexto', encabezado: 'Unidad' },
    { tipo: 'dinero', campo: 'costo', encabezado: 'Costo' },
    { tipo: 'cantidad', campo: 'stock_minimo', encabezado: 'Stock mínimo' },
  ];

  protected readonly insumos = signal<Insumo[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<InsumosPermisos>(PERMISOS_VACIOS);
  protected readonly nombreFiltro = signal('');
  protected readonly stockBajoFiltro = signal(false);

  // Catalogo chico y sin paginar (ver BUSCADOR_UNIDAD_MEDIDA) -- se carga
  // una vez con buscar('') para resolver "unidad_medida_id" a un nombre
  // legible en la tabla, ya que InsumoResource solo devuelve el id crudo.
  protected readonly nombresUnidadMedida = signal(new Map<number, string>());

  private ultimoEvento: DataTableLazyEvent = {
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  };

  ngOnInit(): void {
    this.cargar(this.ultimoEvento);
    this.buscadorUnidadMedida.buscar('').subscribe((unidades) => {
      this.nombresUnidadMedida.set(
        new Map(unidades.map((u) => [u.id, u.nombre])),
      );
    });
  }

  onNombreInput(texto: string): void {
    this.nombreFiltro.set(texto);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onStockBajoCambio(valor: boolean): void {
    this.stockBajoFiltro.set(valor);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.errorCarga.set(false);
    this.loading.set(true);

    this.insumoService
      .listar(evento, {
        nombre: this.nombreFiltro(),
        stockBajo: this.stockBajoFiltro(),
      })
      .subscribe({
        next: (respuesta) => {
          this.insumos.set(respuesta.data);
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
    this.insumos().map((f) => ({
      ...f,
      unidadTexto:
        this.nombresUnidadMedida().get(f.unidad_medida_id) ??
        'Unidad #' + f.unidad_medida_id,
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
  protected readonly filaInactiva = (fila: Insumo) => !fila.activo;

  limpiarFiltros(): void {
    this.nombreFiltro.set('');
    this.stockBajoFiltro.set(false);
    this.reintentar();
  }
}
