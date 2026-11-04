import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TableLazyLoadEvent, SortableColumn, SortIcon, Table } from 'primeng/table';
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

@Component({
  selector: 'ui-tabla',
  standalone: true,
  imports: [
    Table,
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

    this.cambio.emit({
      page: Math.floor(first / rows) + 1,
      rows,
      sortField: (evento.sortField as string | undefined) ?? null,
      sortOrder: orden,
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
