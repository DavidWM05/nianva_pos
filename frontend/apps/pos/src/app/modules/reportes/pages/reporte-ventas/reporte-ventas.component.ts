import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { RespuestaDe } from '@nianva/api-contrato';
import { SucursalService, type SucursalSimple } from '@nianva/domain-administracion';
import { SesionActualService } from '@nianva/domain-sesion';
import { VentaService, type ReporteVentasFiltros } from '@nianva/domain-tpv';
import { TablaComponent, type ColumnaListado } from '@nianva/ui-data';
import { KpiComponent, ToastService } from '@nianva/ui-feedback';
import { SectionComponent } from '@nianva/ui-layout';
import { GraficaSerieComponent, ReportComponent, ReportFiltrosComponent, type CambioReporte } from '@nianva/ui-report';
import { mensajeError } from '@nianva/ui-shared';

import { ConsultaReporte } from '../../consulta-reporte';
import { metricasReportes } from '../../metricas-reportes';

type Datos = RespuestaDe<'/ventas/reporte', 'get'>['data'];

/** Reporte de solo lectura, con filtros de fecha/sucursal (ver VentaService.reporte()). */
@Component({
  selector: 'nucleo-reporte-ventas',
  standalone: true,
  imports: [GraficaSerieComponent, KpiComponent, ReportComponent, ReportFiltrosComponent, SectionComponent, TablaComponent],
  templateUrl: './reporte-ventas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteVentasComponent implements OnInit {
  static readonly metricas = metricasReportes.ventas;

  private readonly servicio = inject(VentaService);
  private readonly sucursalService = inject(SucursalService);
  private readonly sesionActual = inject(SesionActualService);
  private readonly toast = inject(ToastService);
  protected readonly sucursales = signal<SucursalSimple[]>([]);
  protected readonly sucursalUsuario = computed(() => this.sesionActual.sesion()?.sucursal ?? null);
  protected readonly puedeConsolidar = computed(() => this.sesionActual.sesion()?.permisos.includes('sucursales.todas') === true);
  protected readonly puedeElegirSucursal = computed(() =>
    this.puedeConsolidar() && this.sesionActual.sesion()?.permisos.includes('usuarios.ver') === true,
  );
  private filtros: ReporteVentasFiltros = { fechaDesde: null, fechaHasta: null, sucursalId: null };

  protected readonly consulta = new ConsultaReporte(
    ({ page, rows }) => this.servicio.reportePaginado(this.filtros, page, rows),
    '/ventas/reporte/exportar',
    () => {
      const { fechaDesde, fechaHasta, sucursalId } = this.filtros;
      return {
        ...(fechaDesde ? { fecha_desde: fechaDesde } : {}),
        ...(fechaHasta ? { fecha_hasta: fechaHasta } : {}),
        ...(sucursalId ? { sucursal_id: sucursalId } : {}),
      };
    },
  );
  protected readonly datos = computed(() => this.consulta.respuesta()?.data);
  protected readonly puntos = computed(() => this.datos()?.por_dia.map(
    ({ fecha, vendido }) => ({ fecha, importe: vendido }),
  ) ?? []);
  protected readonly columnas: ColumnaListado<Datos['detalle'][number]>[] = [
    { tipo: 'principal', campo: 'folio', encabezado: 'Folio' },
    { tipo: 'texto', campo: 'tipo', encabezado: 'Operación' },
    { tipo: 'fechaHora', campo: 'fecha', encabezado: 'Fecha' },
    { tipo: 'dinero', campo: 'importe_comercial', encabezado: 'Importe comercial' },
  ];
  protected readonly columnasSucursal: ColumnaListado<Datos['por_sucursal'][number]>[] = [
    { tipo: 'principal', campo: 'sucursal_nombre', encabezado: 'Sucursal' },
    { tipo: 'dinero', campo: 'total', encabezado: 'Total' },
    { tipo: 'cantidad', campo: 'numero_ventas', encabezado: 'Ventas' },
  ];
  protected readonly columnasPago: ColumnaListado<Datos['por_metodo_pago'][number]>[] = [
    { tipo: 'principal', campo: 'metodo_pago_nombre', encabezado: 'Método de pago' },
    { tipo: 'dinero', campo: 'total', encabezado: 'Total' },
  ];
  protected readonly columnasProductos: ColumnaListado<Datos['top_productos'][number]>[] = [
    { tipo: 'principal', campo: 'producto_nombre', encabezado: 'Producto' },
    { tipo: 'texto', campo: 'nombre', encabezado: 'Variante' },
    { tipo: 'cantidad', campo: 'cantidad_vendida', encabezado: 'Cantidad' },
    { tipo: 'dinero', campo: 'total_vendido', encabezado: 'Total' },
  ];
  private readonly destruccion = takeUntilDestroyed<SucursalSimple[]>();

  ngOnInit(): void {
    this.consulta.cargar();
    if (this.puedeElegirSucursal()) {
      this.sucursalService.listar().pipe(this.destruccion).subscribe({
        next: (sucursales) => this.sucursales.set(sucursales),
        error: (error: unknown) => this.toast.error(mensajeError(error, 'No se pudieron cargar las sucursales.')),
      });
    }
  }

  protected filtrar({ desde, hasta, sucursalId }: CambioReporte): void {
    this.filtros = {
      fechaDesde: desde,
      fechaHasta: hasta,
      sucursalId: this.puedeElegirSucursal() ? sucursalId : null,
    };
    this.consulta.reiniciar();
  }
}
