import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TableLazyLoadEvent, SortableColumn, SortIcon, Table } from 'primeng/table';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { PantallaService } from '@nianva/ui-layout';
import type { AccionEmitida } from '@nianva/ui-actions';
import { BadgeComponent, SkeletonComponent, conUmbral } from '@nianva/ui-feedback';
import { CantidadPipe, DineroPipe, FechaHoraPipe, FechaPipe, PorcentajePipe } from '@nianva/ui-format';
import { EmptyComponent } from './empty.component';
import {
  CambioListado,
  ColumnaAcciones,
  ColumnaCantidad,
  ColumnaListado,
  ColumnaPrincipal,
  MetaListado,
} from './listado.types';
import { RowActionsComponent } from '@nianva/ui-actions';

let siguienteIdOrden = 0;

@Component({
  selector: 'ui-tabla',
  standalone: true,
  imports: [
    Table,
    Paginator,
    SortableColumn,
    SortIcon,
    BadgeComponent,
    SkeletonComponent,
    EmptyComponent,
    RowActionsComponent,
    CantidadPipe,
    DineroPipe,
    PorcentajePipe,
    FechaPipe,
    FechaHoraPipe,
  ],
  templateUrl: './tabla.component.html',
  styleUrl: './tabla.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablaComponent<T extends object> {
  readonly columnas = input.required<readonly ColumnaListado<T>[]>();
  readonly filas = input.required<T[]>();
  readonly meta = input<MetaListado | null>(null);
  readonly cargando = input(false);
  readonly mensajeVacio = input('No hay resultados.');
  readonly filaInactiva = input<((fila: T) => boolean) | undefined>(undefined);
  readonly totales = input<Partial<Record<keyof T, number>> | null>(null);

  readonly cambio = output<CambioListado>();
  readonly accion = output<{ fila: T; accion: AccionEmitida }>();

  protected readonly pantalla = inject(PantallaService);
  /** Unico por instancia: con dos tablas en la pantalla, cada "Ordenar" apunta a su selector. */
  protected readonly idOrden = `ui-tabla-orden-${++siguienteIdOrden}`;
  protected readonly ordenCampo = signal<string | null>(null);
  protected readonly ordenDireccion = signal<'asc' | 'desc'>('asc');
  protected readonly columnasOrdenables = computed(() =>
    this.columnas()
      .filter((columna) => columna.ordenable === true && columna.campo !== undefined)
      .map((columna) => ({ campo: String(columna.campo), encabezado: columna.encabezado ?? '' })),
  );
  protected readonly columnasTabla = computed(() =>
    this.columnas().map((columna) => ({
      field: columna.campo === undefined ? 'acciones' : String(columna.campo),
      header: columna.encabezado ?? '',
      sortable: columna.ordenable ?? false,
    })),
  );
  protected readonly indicadorCarga = conUmbral(this.cargando);
  protected readonly primeraCarga = computed(() => this.cargando() && this.filas().length === 0);
  protected readonly filasSkeleton = computed(() =>
    Array.from({ length: Math.max(1, Math.min(100, this.meta()?.rows ?? 10)) }, (_, indice) => indice),
  );
  protected readonly rowsActuales = computed(() => Math.max(1, Math.min(100, this.meta()?.rows ?? 25)));
  protected readonly first = computed(() => (Math.max(1, this.meta()?.page ?? 1) - 1) * this.rowsActuales());

  protected onLazyLoad(evento: TableLazyLoadEvent): void {
    const rows = Math.max(1, Math.min(100, evento.rows ?? this.rowsActuales()));
    const first = evento.first ?? 0;
    const orden = evento.sortOrder === 1 ? 'asc' : evento.sortOrder === -1 ? 'desc' : null;

    this.ordenCampo.set((evento.sortField as string | undefined) ?? null);
    this.ordenDireccion.set(orden ?? 'asc');

    this.cambio.emit({
      page: Math.floor(first / rows) + 1,
      rows,
      sortField: (evento.sortField as string | undefined) ?? null,
      sortOrder: orden,
    });
  }

  protected onPagina(evento: PaginatorState): void {
    this.cambio.emit({
      page: (evento.page ?? 0) + 1,
      rows: evento.rows ?? this.rowsActuales(),
      sortField: this.ordenCampo(),
      sortOrder: this.ordenCampo() === null ? null : this.ordenDireccion(),
    });
  }

  protected cambiarOrden(evento: Event): void {
    const campo = (evento.target as HTMLSelectElement).value;

    this.ordenCampo.set(campo === '' ? null : campo);
    this.emitirCambioDeOrden();
  }

  protected alternarDireccion(): void {
    this.ordenDireccion.update((direccion) => (direccion === 'asc' ? 'desc' : 'asc'));
    this.emitirCambioDeOrden();
  }

  // Igual que p-table al ordenar: un orden nuevo vuelve a la primera pagina.
  private emitirCambioDeOrden(): void {
    this.cambio.emit({
      page: 1,
      rows: this.rowsActuales(),
      sortField: this.ordenCampo(),
      sortOrder: this.ordenCampo() === null ? null : this.ordenDireccion(),
    });
  }

  protected onAccion(fila: T, accion: AccionEmitida): void {
    this.accion.emit({ fila, accion });
  }

  protected texto(fila: T, campo: keyof T): unknown {
    return fila[campo];
  }

  protected apoyo(columna: ColumnaPrincipal<T>, fila: T): unknown {
    return columna.apoyo ? fila[columna.apoyo] : null;
  }

  protected valor(fila: T, campo: keyof T): unknown {
    return fila[campo];
  }

  protected esNegativo(fila: T, campo: keyof T): boolean {
    return Number(fila[campo]) < 0;
  }

  protected unidad(columna: ColumnaCantidad<T>, fila: T): string {
    const unidad = columna.unidad;

    if (! unidad) {
      return '';
    }

    if (Object.prototype.hasOwnProperty.call(fila, unidad)) {
      return String(fila[unidad as keyof T] ?? '');
    }

    return String(unidad);
  }

  protected esInactiva(fila: T): boolean {
    return this.filaInactiva()?.(fila) ?? false;
  }

  protected acciones(columna: ColumnaAcciones<T>, fila: T) {
    return columna.acciones(fila);
  }

  protected valorEstado(fila: T, columna: { campo: keyof T }): string {
    return String(fila[columna.campo] ?? '');
  }

  protected hayTotal(columna: ColumnaListado<T>): boolean {
    return this.totalDe(columna) !== null;
  }

  protected totalDe(columna: ColumnaListado<T>): number | null {
    const campo = columna.campo;
    const totales = this.totales();

    if (campo === undefined) {
      return null;
    }

    const total = totales?.[campo];

    return typeof total === 'number' && Number.isFinite(total) ? total : null;
  }

  protected unidadTotal(columna: ColumnaListado<T>): string {
    if (columna.tipo !== 'cantidad') {
      return '';
    }

    return typeof columna.unidad === 'string' ? columna.unidad : '';
  }
}
