import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import type { RespuestaDe } from '@nianva/api-contrato';
import { CuentaCobrarService } from '@nianva/domain-cuentas-cobrar';
import { TablaComponent, type ColumnaListado } from '@nianva/ui-data';
import { KpiComponent } from '@nianva/ui-feedback';
import { SectionComponent } from '@nianva/ui-layout';
import { ReportComponent } from '@nianva/ui-report';

import { ConsultaReporte } from '../../consulta-reporte';
import { metricasReportes } from '../../metricas-reportes';

type Datos = RespuestaDe<'/cuentas-cobrar/reporte', 'get'>['data'];

/**
 * Implementación previa a UI-10.
 *
 * Reporte de antigüedad de saldos -- solo lectura, sin paginar (top-N por
 * saldo, ver CuentaCobrarService.reporte()). Mismo patrón visual de
 * "tiles" que InicioComponent.
 */
/**
 * Reporte de antigüedad de saldos. El detalle se pagina en el servidor y
 * los totales se calculan sobre todas las cuentas del tenant.
 */
@Component({
  selector: 'nucleo-reporte-cuentas-cobrar',
  standalone: true,
  imports: [KpiComponent, ReportComponent, SectionComponent, TablaComponent],
  templateUrl: './reporte-cuentas-cobrar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteCuentasCobrarComponent implements OnInit {
  static readonly metricas = metricasReportes['cuentas-cobrar'];

  private readonly servicio = inject(CuentaCobrarService);
  protected readonly consulta = new ConsultaReporte(
    ({ page, rows }) => this.servicio.reportePaginado(10, page, rows),
    '/cuentas-cobrar/reporte/exportar',
    () => ({ limite: 10 }),
  );
  protected readonly datos = computed(() => this.consulta.respuesta()?.data);
  protected readonly columnas: ColumnaListado<Datos['detalle'][number]>[] = [
    { tipo: 'principal', campo: 'cliente_nombre', encabezado: 'Cliente' },
    { tipo: 'fecha', campo: 'fecha_vencimiento', encabezado: 'Vencimiento' },
    { tipo: 'dinero', campo: 'saldo_pendiente', encabezado: 'Saldo pendiente' },
  ];
  protected readonly columnasAntiguedad: ColumnaListado<Datos['por_antiguedad']>[] = [
    { tipo: 'dinero', campo: 'al_dia', encabezado: 'Al día' },
    { tipo: 'dinero', campo: 'vencido_1_30', encabezado: '1–30 días' },
    { tipo: 'dinero', campo: 'vencido_31_60', encabezado: '31–60 días' },
    { tipo: 'dinero', campo: 'vencido_61_90', encabezado: '61–90 días' },
    { tipo: 'dinero', campo: 'vencido_90_mas', encabezado: 'Más de 90 días' },
  ];
  protected readonly columnasRanking: ColumnaListado<Datos['por_cliente'][number]>[] = [
    { tipo: 'principal', campo: 'cliente_nombre', encabezado: 'Cliente' },
    { tipo: 'dinero', campo: 'saldo_pendiente', encabezado: 'Saldo pendiente' },
    { tipo: 'cantidad', campo: 'cuentas_pendientes', encabezado: 'Cuentas' },
  ];

  ngOnInit(): void {
    this.consulta.cargar();
  }
}
