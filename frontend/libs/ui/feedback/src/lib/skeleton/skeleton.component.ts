import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Skeleton } from 'primeng/skeleton';

export type FormaSkeleton = 'texto' | 'bloque' | 'circulo';

const ALTO_POR_FORMA: Record<FormaSkeleton, string> = {
  texto: '1rem',
  bloque: '8rem',
  circulo: '3rem',
};

/**
 * Marcador con la forma del contenido mientras carga (UI-18), nunca un
 * texto "Cargando..." suelto. Envuelve p-skeleton para que el color y la
 * animacion salgan del preset de ui/tokens.
 *
 *   <ui-skeleton forma="texto" [lineas]="3" />
 *   <ui-skeleton forma="bloque" ancho="12rem" alto="12rem" />
 */
@Component({
  selector: 'ui-skeleton',
  standalone: true,
  imports: [Skeleton],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-busy': 'true',
    '[attr.aria-label]': 'etiqueta()',
  },
})
export class SkeletonComponent {
  readonly forma = input<FormaSkeleton>('texto');
  readonly ancho = input<string>('100%');
  readonly alto = input<string | null>(null);
  readonly lineas = input(1);
  /** Lo que lee un lector de pantalla mientras carga. */
  readonly etiqueta = input('Cargando contenido');

  protected readonly altoFinal = computed(() => this.alto() ?? ALTO_POR_FORMA[this.forma()]);
  protected readonly anchoFinal = computed(() => (this.forma() === 'circulo' ? this.altoFinal() : this.ancho()));
  protected readonly filas = computed(() => Array.from({ length: Math.max(1, this.lineas()) }, (_, i) => i));
}
