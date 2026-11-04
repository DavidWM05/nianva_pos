import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ColumnaListado, MetaListado, TablaComponent } from '@nianva/ui-data';
import { KpiComponent } from '@nianva/ui-feedback';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { ReportComponent, ReportFiltrosComponent } from '@nianva/ui-report';

interface FilaReporte {
  concepto: string;
  monto: number;
  piezas: number;
  margen: number;
}

@Component({
  selector: 'cat-report-page',
  standalone: true,
  imports: [KpiComponent, PageHeaderComponent, ReportComponent, ReportFiltrosComponent, SectionComponent, TablaComponent],
  template: `
    <ui-page-header clave="catalogo-report" subtitulo="Plantilla completa, sin gráfica y estados" />

    <ui-section titulo="Reporte con gráfica">
      <ui-report
        clave="catalogo-report"
        estado="listo"
        [exportando]="exportando()"
        (exportar)="exportando.set(true)"
        (reintentar)="reintentos.set(reintentos() + 1)"
      >
        <ui-report-filtros
          filtros
          [sucursales]="sucursales"
          [puedeElegirSucursal]="true"
          [sucursalUsuario]="sucursales[0]"
        />
        <div kpis>
          <ui-kpi etiqueta="Ventas" [valor]="2050.5" formato="dinero" [variacion]="12.5" />
          <ui-kpi etiqueta="Tickets" [valor]="18" formato="cantidad" unidad="ticket" [variacion]="0" />
          <ui-kpi etiqueta="Margen" [valor]="14" formato="porcentaje" [variacion]="-2" />
        </div>
        <div grafica>
          <p>Espacio reservado para la gráfica de la Fase 6.</p>
        </div>
        <ui-tabla
          detalle
          [columnas]="columnas"
          [filas]="filas"
          [meta]="meta"
          [totales]="totales"
        />
      </ui-report>
    </ui-section>

    <ui-section titulo="Reporte sin gráfica">
      <ui-report clave="catalogo-report" estado="listo">
        <ui-report-filtros filtros [sucursales]="sucursales" [puedeElegirSucursal]="false" [sucursalUsuario]="sucursales[0]" />
        <div kpis><ui-kpi etiqueta="Ventas" [valor]="1250.5" formato="dinero" /></div>
        <ui-tabla detalle [columnas]="columnas" [filas]="filas" [meta]="meta" />
      </ui-report>
    </ui-section>

    <ui-section titulo="Reporte cargando">
      <ui-report clave="catalogo-report" estado="cargando" />
    </ui-section>

    <ui-section titulo="Reporte con error">
      <ui-report clave="catalogo-report" estado="error" (reintentar)="reintentos.set(reintentos() + 1)" />
      <p>Reintentos: {{ reintentos() }}</p>
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportPage {
  protected readonly exportando = signal(false);
  protected readonly reintentos = signal(0);
  protected readonly sucursales = [
    { id: 1, nombre: 'Centro' },
    { id: 2, nombre: 'Norte' },
  ];
  protected readonly columnas: ColumnaListado<FilaReporte>[] = [
    { tipo: 'texto', campo: 'concepto', encabezado: 'Concepto' },
    { tipo: 'dinero', campo: 'monto', encabezado: 'Monto' },
    { tipo: 'cantidad', campo: 'piezas', encabezado: 'Piezas', unidad: 'pieza' },
    { tipo: 'porcentaje', campo: 'margen', encabezado: 'Margen' },
  ];
  protected readonly filas: FilaReporte[] = [
    { concepto: 'Ventas del día', monto: 1250.5, piezas: 12, margen: 16 },
    { concepto: 'Ventas del periodo', monto: 800, piezas: 6, margen: 12 },
  ];
  protected readonly meta: MetaListado = { total: 2, page: 1, rows: 25, filtros_aplicados: {}, permisos: {} };
  protected readonly totales: Partial<Record<keyof FilaReporte, number>> = { monto: 2050.5, piezas: 18, margen: 14 };
}
