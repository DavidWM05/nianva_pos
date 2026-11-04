import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ColumnaListado, EmptyComponent, FilterBarComponent, MetaListado, TablaComponent } from '@nianva/ui-data';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';

interface FilaDemo {
  producto: string;
  categoria: string;
  ventas: number;
  piezas: number;
  margen: number;
  estado: string;
  activo: boolean;
}

@Component({
  selector: 'cat-data-page',
  standalone: true,
  imports: [EmptyComponent, FilterBarComponent, PageHeaderComponent, SectionComponent, TablaComponent],
  template: `
    <ui-page-header clave="catalogo-data" subtitulo="Estado vacío, filtros y tabla" />

    <ui-section titulo="Empty">
      <ui-empty />
      <ui-empty mensaje="Sin ventas en este periodo." icono="pi pi-search" />
    </ui-section>

    <ui-section titulo="Filter bar">
      <ui-filter-bar [meta]="meta" [hayFiltros]="false">
        <span>Filtros propios del reporte</span>
      </ui-filter-bar>
      <ui-filter-bar [meta]="meta" [hayFiltros]="true" (limpiar)="limpiar()" />
      <p>Limpiezas: {{ limpiados() }}</p>
    </ui-section>

    <ui-section titulo="Tabla con totales y fila inactiva">
      <ui-tabla
        [columnas]="columnas"
        [filas]="filas"
        [meta]="meta"
        [totales]="totales"
        [filaInactiva]="esInactiva"
      />
    </ui-section>

    <ui-section titulo="Tabla vacía">
      <ui-tabla [columnas]="columnas" [filas]="[]" [meta]="metaVacia" mensajeVacio="Sin resultados." />
    </ui-section>

    <ui-section titulo="Tabla cargando">
      <ui-tabla [columnas]="columnas" [filas]="[]" [meta]="meta" [cargando]="true" />
    </ui-section>

    <ui-section titulo="Modo tarjeta en celular">
      <p>ui-tabla aún no implementa el modo tarjeta; en 375 px se revisa el scroll horizontal. Se reporta como variante faltante.</p>
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataPage {
  protected readonly columnas: ColumnaListado<FilaDemo>[] = [
    { tipo: 'principal', campo: 'producto', encabezado: 'Producto', apoyo: 'categoria', ordenable: true },
    { tipo: 'dinero', campo: 'ventas', encabezado: 'Ventas', ordenable: true },
    { tipo: 'cantidad', campo: 'piezas', encabezado: 'Piezas', unidad: 'pieza' },
    { tipo: 'porcentaje', campo: 'margen', encabezado: 'Margen' },
    { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'venta' },
    { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] },
  ];
  protected readonly filas: FilaDemo[] = [
    { producto: 'Playera', categoria: 'Ropa', ventas: 1250.5, piezas: 12, margen: 16, estado: 'completada', activo: true },
    { producto: 'Pantalón', categoria: 'Ropa', ventas: 800, piezas: 5, margen: 12, estado: 'anulada', activo: false },
  ];
  protected readonly meta: MetaListado = {
    total: 2,
    page: 1,
    rows: 25,
    filtros_aplicados: {},
    permisos: {},
  };
  protected readonly metaVacia: MetaListado = { ...this.meta, total: 0 };
  protected readonly totales: Partial<Record<keyof FilaDemo, number>> = { ventas: 2050.5, piezas: 17, margen: 14 };
  protected readonly esInactiva = (fila: FilaDemo): boolean => !fila.activo;

  protected readonly limpiados = signal(0);

  protected limpiar(): void {
    this.limpiados.update((total) => total + 1);
  }
}
