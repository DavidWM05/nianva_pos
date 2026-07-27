import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusBadgeColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * El consumidor decide que color corresponde a cada valor -- este
 * componente no sabe (ni le importa) si "activo" es un estado de venta,
 * de apartado o de licencia. Ejemplo de uso:
 *
 *   <nucleo-status-badge value="anulada" [colorMap]="{ completada: 'success', anulada: 'danger' }" />
 */
export type StatusBadgeColorMap = Record<string, StatusBadgeColor>;

@Component({
  selector: 'nucleo-status-badge',
  standalone: true,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  value = input.required<string>();
  colorMap = input<StatusBadgeColorMap>({});
  /** Texto a mostrar; por defecto el propio `value`. */
  label = input<string | null>(null);

  protected readonly resolvedColor = computed<StatusBadgeColor>(
    () => this.colorMap()[this.value()] ?? 'neutral',
  );
  protected readonly resolvedLabel = computed(() => this.label() ?? this.value());
}
