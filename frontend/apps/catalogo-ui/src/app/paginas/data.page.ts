import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnaListado, EmptyComponent, FilterBarComponent, MetaListado, TablaComponent } from '@nianva/ui-data';
import { CampoComponent, SelectFiltroComponent } from '@nianva/ui-forms';
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
  imports: [
    CampoComponent,
    EmptyComponent,
    FilterBarComponent,
    FormsModule,
    PageHeaderComponent,
    SectionComponent,
    SelectFiltroComponent,
    TablaComponent,
  ],
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
      <!-- La barra de un listado: busqueda nativa junto a un selector, con la misma caja y el mismo alto. -->
      <ui-filter-bar [meta]="meta">
        <ui-campo #buscador etiqueta="Buscar">
          <input
            type="search"
            [id]="buscador.controlId()"
            placeholder="Buscar por nombre..."
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)"
          />
        </ui-campo>
        <ui-campo etiqueta="Estado">
          <ui-select-filtro [opciones]="estados" [ngModel]="estado()" (ngModelChange)="estado.set($event)" />
        </ui-campo>
      </ui-filter-bar>
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
      <p>Debajo de md, ui-tabla pasa a tarjetas; arriba sigue mostrando la tabla.</p>
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
  protected readonly busqueda = signal('');
  protected readonly estado = signal<string | null>(null);
  protected readonly estados = [
    { label: 'Completada', value: 'completada' },
    { label: 'Anulada', value: 'anulada' },
  ];

  protected limpiar(): void {
    this.limpiados.update((total) => total + 1);
  }
}
