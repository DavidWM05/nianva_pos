import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { RespuestaDe } from '@nianva/api-contrato';
import { CajaService } from '@nianva/domain-tpv';
import { SkeletonComponent } from '@nianva/ui-feedback';
import { DineroPipe } from '@nianva/ui-format';
import { CeldaImpreso, ImpresionService } from '@nianva/ui-print';
import { DatosComponent } from '@nianva/ui-layout';
import { mensajeError } from '@nianva/ui-shared';
import { finalize } from 'rxjs';

import { IntentoOperacion } from '../../../../core/operaciones/intento-operacion';

type Consolidado = RespuestaDe<'/caja/consolidado', 'get'>;

@Component({
  selector: 'nucleo-consolidado-caja',
  standalone: true,
  imports: [RouterLink, MatButton, DineroPipe, DatosComponent, SkeletonComponent],
  templateUrl: './consolidado-caja.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolidadoCajaComponent {
  private readonly impresion = inject(ImpresionService);
  private readonly caja = inject(CajaService);
  private readonly intento = new IntentoOperacion();

  protected readonly fecha = signal('');
  protected readonly ocupado = signal(false);
  protected readonly resumen = signal<Consolidado['data'] | null>(null);
  protected readonly error = signal('');

  protected cargar(consolidar: boolean): void {
    const fecha = this.fecha();
    if (!fecha || this.ocupado()) return;

    this.ocupado.set(true);
    this.error.set('');
    const peticion = consolidar
      ? this.intento.ejecutar({ fecha_operativa: fecha }, llave => this.caja.consolidar(fecha, llave))
      : this.caja.consultarConsolidado(fecha);
    peticion.pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: resumen => this.resumen.set(resumen),
      error: error => this.error.set(mensajeError(error, 'No se pudo cargar el consolidado.')),
    });
  }

  protected imprimir(): void {
    const dia = this.resumen();
    if (!dia?.documentos.length) return;

    const filas: CeldaImpreso[][] = dia.documentos.flatMap(documento => {
      const titulo = documento.original_id ? 'Consolidado complementario' : 'Consolidado original';
      const etiqueta = documento.supervisor_apertura
        ? { texto: titulo, detalle: documento.supervisor_apertura }
        : { texto: titulo };
      return [
        [etiqueta, { dinero: documento.total_teorico }, { dinero: documento.total_contado }, { dinero: documento.diferencia }],
        ...documento.cortes.map(corte => [
          { texto: corte.terminal, detalle: corte.folio },
          { dinero: corte.total_teorico }, { dinero: corte.monto_contado }, { dinero: corte.diferencia },
        ]),
      ];
    });
    this.impresion.imprimir({
      titulo: `Consolidado de caja · ${dia.fecha_operativa}`,
      encabezado: dia.encabezado,
      tabla: {
        columnas: [
          { titulo: 'Documento / corte', numerica: false },
          { titulo: 'Teórico', numerica: true },
          { titulo: 'Contado', numerica: true },
          { titulo: 'Diferencia', numerica: true },
        ],
        filas,
      },
      totales: [
        { etiqueta: 'Total teórico', importe: dia.total_teorico, destacado: false },
        { etiqueta: 'Total contado', importe: dia.total_contado, destacado: true },
        { etiqueta: 'Diferencia del día', importe: dia.diferencia, destacado: false },
      ],
      pagos: [],
      pie: null,
    }, 'carta');
  }
}
