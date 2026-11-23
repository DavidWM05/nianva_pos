import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DineroPipe, FechaPipe } from '@nianva/ui-format';

export interface PuntoSerieReporte {
  fecha: string;
  importe: string | number;
}

@Component({
  selector: 'ui-grafica-serie',
  standalone: true,
  imports: [DineroPipe, FechaPipe],
  templateUrl: './grafica-serie.component.html',
  styleUrl: './grafica-serie.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficaSerieComponent {
  readonly titulo = input.required<string>();
  readonly puntos = input.required<readonly PuntoSerieReporte[]>();

  protected readonly barras = computed(() => {
    const montos = this.puntos().map((punto) => Number(punto.importe));
    const maximo = montos.reduce((mayor, monto) => Math.max(mayor, Math.abs(monto)), 0);
    return this.puntos().map((punto, indice) => ({
      ...punto,
      negativo: montos[indice] < 0,
      ancho: maximo === 0 ? 0 : Math.abs(montos[indice]) / maximo * 100,
    }));
  });
}
