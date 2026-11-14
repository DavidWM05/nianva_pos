import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SkeletonComponent } from '@nianva/ui-feedback';
import { CantidadPipe, FechaHoraPipe } from '@nianva/ui-format';

import { CrmAvanzadoService } from '../../../crm/crm-avanzado.service';
import { ReporteCrm } from '../../../crm/crm-avanzado.types';

const ETIQUETAS_TIPO_INTERACCION: Record<string, string> = {
  llamada: 'Llamada',
  email: 'Email',
  whatsapp: 'WhatsApp',
  nota: 'Nota',
  visita: 'Visita',
};

/** Reporte de solo lectura, sin paginar (ver CrmAvanzadoService.reporte()). */
@Component({
  selector: 'nucleo-reporte-crm',
  standalone: true,
  imports: [KeyValuePipe, SkeletonComponent, CantidadPipe, FechaHoraPipe],
  templateUrl: './reporte-crm.component.html',
  styleUrl: './reporte-crm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteCrmComponent implements OnInit {
  private readonly crmAvanzadoService = inject(CrmAvanzadoService);

  protected readonly cargando = signal(true);
  protected readonly reporte = signal<ReporteCrm | null>(null);

  ngOnInit(): void {
    this.crmAvanzadoService.reporte().subscribe({
      next: (reporte) => {
        this.reporte.set(reporte);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected etiquetaTipo(tipo: string): string {
    return ETIQUETAS_TIPO_INTERACCION[tipo] ?? tipo;
  }
}
