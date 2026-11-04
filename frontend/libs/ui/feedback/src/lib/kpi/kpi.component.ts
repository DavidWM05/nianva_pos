import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CantidadPipe, DineroPipe, PorcentajePipe } from '@nianva/ui-format';

import { SkeletonComponent } from '../skeleton/skeleton.component';

export type FormatoKpi = 'dinero' | 'cantidad' | 'porcentaje' | 'texto';
export type TonoVariacion = 'exito' | 'peligro' | 'neutro';

@Component({
  selector: 'ui-kpi',
  standalone: true,
  imports: [CantidadPipe, DineroPipe, PorcentajePipe, SkeletonComponent],
  templateUrl: './kpi.component.html',
  styleUrl: './kpi.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input<number | string | null>(null);
  readonly formato = input<FormatoKpi>('texto');
  readonly unidad = input('');
  readonly variacion = input<number | null>(null);
  readonly cargando = input(false);

  protected readonly tonoVariacion = computed<TonoVariacion>(() => {
    const variacion = this.variacion();

    if (variacion === null || variacion === 0) {
      return 'neutro';
    }

    return variacion > 0 ? 'exito' : 'peligro';
  });

  protected readonly iconoVariacion = computed(() => {
    const variacion = this.variacion();

    if (variacion === null || variacion === 0) {
      return 'pi pi-minus';
    }

    return variacion > 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
  });

  protected readonly textoVariacion = computed(() => {
    const variacion = this.variacion();

    if (variacion === null) {
      return null;
    }

    if (variacion === 0) {
      return '0%';
    }

    return `${variacion > 0 ? '+' : ''}${variacion}%`;
  });

  protected readonly ariaVariacion = computed(() => {
    const variacion = this.variacion();

    if (variacion === null) {
      return null;
    }

    if (variacion === 0) {
      return 'Sin variación';
    }

    return `${variacion > 0 ? 'Subió' : 'Bajó'} ${Math.abs(variacion)} puntos porcentuales`;
  });
}
