import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import type { RespuestaDe } from '@nianva/api-contrato';
import { CrmAvanzadoService } from '@nianva/domain-crm';
import { TablaComponent, type ColumnaListado } from '@nianva/ui-data';
import { KpiComponent } from '@nianva/ui-feedback';
import { SectionComponent } from '@nianva/ui-layout';
import { ReportComponent } from '@nianva/ui-report';

import { ConsultaReporte } from '../../consulta-reporte';
import { metricasReportes } from '../../metricas-reportes';

type Datos = RespuestaDe<'/crm/reporte', 'get'>['data'];
interface Interaccion {
  tipo: string;
  total: number;
}

/**
 * Versión anterior a UI-10.
 * Reporte de solo lectura, sin paginar (ver CrmAvanzadoService.reporte()).
 */
@Component({
  selector: 'nucleo-reporte-crm',
  standalone: true,
  imports: [KpiComponent, ReportComponent, SectionComponent, TablaComponent],
  templateUrl: './reporte-crm.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteCrmComponent implements OnInit {
  static readonly metricas = metricasReportes.crm;

  private readonly servicio = inject(CrmAvanzadoService);
  protected readonly consulta = new ConsultaReporte(
    ({ page, rows }) => this.servicio.reportePaginado(page, rows),
    '/crm/reporte/exportar',
  );
  protected readonly datos = computed(() => this.consulta.respuesta()?.data);
  protected readonly interacciones = computed(() =>
    Object.entries(this.datos()?.interacciones_por_tipo ?? {}).map(([tipo, total]) => ({
      tipo: ETIQUETAS_INTERACCION[tipo] ?? tipo, total,
    })),
  );
  protected readonly columnas: ColumnaListado<Datos['detalle'][number]>[] = [
    { tipo: 'principal', campo: 'asunto', encabezado: 'Asunto' },
    { tipo: 'texto', campo: 'segmento', encabezado: 'Segmento' },
    { tipo: 'cantidad', campo: 'destinatarios', encabezado: 'Destinatarios' },
    { tipo: 'fechaHora', campo: 'enviado_en', encabezado: 'Enviada' },
  ];
  protected readonly columnasInteracciones: ColumnaListado<Interaccion>[] = [
    { tipo: 'principal', campo: 'tipo', encabezado: 'Tipo' },
    { tipo: 'cantidad', campo: 'total', encabezado: 'Total' },
  ];

  ngOnInit(): void {
    this.consulta.cargar();
  }
}

const ETIQUETAS_INTERACCION: Record<string, string> = {
  llamada: 'Llamada',
  email: 'Email',
  whatsapp: 'WhatsApp',
  nota: 'Nota',
  visita: 'Visita',
};
