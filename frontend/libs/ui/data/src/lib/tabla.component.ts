import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, input, output, signal } from '@angular/core';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { PantallaService } from '@nianva/ui-layout';
import type { AccionEmitida, AccionFila } from '@nianva/ui-actions';
import { BadgeComponent, SkeletonComponent, conUmbral } from '@nianva/ui-feedback';
import { CantidadPipe, DineroPipe, FechaHoraPipe, FechaPipe, PorcentajePipe } from '@nianva/ui-format';
import { EmptyComponent } from './empty.component';
import {
  CambioListado,
  ColumnaAcciones,
  ColumnaCantidad,
  ColumnaEstado,
  ColumnaListado,
  ColumnaPrincipal,
  MetaListado,
} from './listado.types';
import { PaginadorEs } from './paginador-es';
import { RowActionsComponent } from '@nianva/ui-actions';

let siguienteIdOrden = 0;

@Component({
  selector: 'ui-tabla',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
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
  providers: [{ provide: MatPaginatorIntl, useClass: PaginadorEs }],
  templateUrl: './tabla.component.html',
  styleUrl: './tabla.component.scss',
  encapsulation: ViewEncapsulation.None,
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
    this.columnas().map((columna, indice) => ({
      field: columna.campo === undefined ? 'acciones' : String(columna.campo),
      header: columna.encabezado ?? '',
      sortable: columna.ordenable ?? false,
      tipo: columna.tipo,
      columna,
      indice,
    })),
  );
  protected readonly camposColumnas = computed(() => this.columnasTabla().map((columna) => columna.field));
  protected readonly indicadorCarga = conUmbral(this.cargando);
  protected readonly primeraCarga = computed(() => this.cargando() && this.filas().length === 0);
  protected readonly filasSkeleton = computed(() =>
    Array.from({ length: Math.max(1, Math.min(100, this.meta()?.rows ?? 10)) }, (_, indice) => indice),
  );
  protected readonly rowsActuales = computed(() => Math.max(1, Math.min(100, this.meta()?.rows ?? 25)));
  protected readonly paginaActual = computed(() => Math.max(0, (Math.max(1, this.meta()?.page ?? 1) - 1)));

  protected onSort(evento: Sort): void {
    const campo = evento.active || null;
    const direccion = evento.direction || null;

    this.ordenCampo.set(campo);
    this.ordenDireccion.set(direccion ?? 'asc');
    this.cambio.emit({
      page: 1,
      rows: this.rowsActuales(),
      sortField: campo,
      sortOrder: direccion,
    });
  }

  protected onPagina(evento: PageEvent): void {
    this.cambio.emit({
      page: evento.pageIndex + 1,
      rows: evento.pageSize,
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

  // Un orden nuevo vuelve a la primera pagina.
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

  protected campoDe(columna: ColumnaListado<T>): keyof T {
    return columna.campo as keyof T;
  }

  protected texto(fila: T, campo: keyof T): unknown {
    return fila[campo];
  }

  protected apoyoDe(columna: ColumnaListado<T>, fila: T): unknown {
    if (columna.tipo !== 'principal' || columna.apoyo === undefined) {
      return null;
    }

    return fila[columna.apoyo];
  }

  protected valor(fila: T, campo: keyof T): unknown {
    return fila[campo];
  }

  protected esNegativo(fila: T, campo: keyof T): boolean {
    return Number(fila[campo]) < 0;
  }

  protected unidadDe(columna: ColumnaListado<T>, fila: T): string {
    if (columna.tipo !== 'cantidad') {
      return '';
    }

    return this.unidad(columna as ColumnaCantidad<T>, fila);
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

  protected accionesDe(columna: ColumnaListado<T>, fila: T): readonly AccionFila[] {
    return columna.tipo === 'acciones' ? columna.acciones(fila) : [];
  }

  protected esInactiva(fila: T): boolean {
    return this.filaInactiva()?.(fila) ?? false;
  }

  protected acciones(columna: ColumnaAcciones<T>, fila: T) {
    return columna.acciones(fila);
  }

  protected entidadDe(columna: ColumnaListado<T>): ColumnaEstado<T>['entidad'] {
    return (columna as ColumnaEstado<T>).entidad;
  }

  protected valorEstado(fila: T, columna: ColumnaListado<T>): string {
    return String(fila[this.campoDe(columna)] ?? '');
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

  protected esColumnaPrincipal(columna: ColumnaListado<T>): columna is ColumnaPrincipal<T> {
    return columna.tipo === 'principal';
  }

  protected esColumnaAcciones(columna: ColumnaListado<T>): columna is ColumnaAcciones<T> {
    return columna.tipo === 'acciones';
  }
}
