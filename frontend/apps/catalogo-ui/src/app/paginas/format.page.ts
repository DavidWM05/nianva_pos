import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { CantidadPipe, DineroPipe, FechaHoraPipe, FechaPipe, PorcentajePipe } from '@nianva/ui-format';

@Component({
  selector: 'cat-format-page',
  standalone: true,
  imports: [CantidadPipe, DineroPipe, FechaHoraPipe, FechaPipe, PageHeaderComponent, PorcentajePipe, SectionComponent],
  template: `
    <ui-page-header clave="catalogo-format" subtitulo="Pipes de formato regional" />

    <ui-section titulo="Dinero">
      <p>1250.5: {{ 1250.5 | dinero }}</p>
      <p>-80: {{ -80 | dinero }}</p>
      <p>0: {{ 0 | dinero }}</p>
      <p>null: {{ null | dinero }}</p>
    </ui-section>

    <ui-section titulo="Cantidad">
      <p>1.000 con pza: {{ '1.000' | cantidad: 'pza' }}</p>
      <p>0.5 con kg: {{ 0.5 | cantidad: 'kg' }}</p>
      <p>0 sin unidad: {{ 0 | cantidad }}</p>
      <p>sin dato: {{ null | cantidad: 'pza' }}</p>
    </ui-section>

    <ui-section titulo="Porcentaje">
      <p>16: {{ 16 | porcentaje }}</p>
      <p>7.50: {{ '7.50' | porcentaje }}</p>
      <p>null: {{ null | porcentaje }}</p>
    </ui-section>

    <ui-section titulo="Fechas">
      <p>Fecha sola: {{ '2026-11-02' | fecha }}</p>
      <p>Instante: {{ '2026-11-02T03:00:00.000000Z' | fecha }}</p>
      <p>Fecha y hora: {{ '2026-11-02T03:00:00.000000Z' | fechaHora }}</p>
      <p>Inválida: {{ 'no-es-fecha' | fecha }}</p>
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormatPage {}
