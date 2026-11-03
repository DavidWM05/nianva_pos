import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EntidadConEstado, estadoVisual } from '../estados/registro-estados';

/**
 * Badge de estado (UI-06): la etiqueta, el tono y el icono salen de
 * REGISTRO_ESTADOS, nunca de la pantalla. El estado normal de la entidad no
 * pinta nada.
 *
 *   <ui-badge entidad="venta" [estado]="venta.estado" />
 */
@Component({
  selector: 'ui-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly entidad = input.required<EntidadConEstado>();
  readonly estado = input.required<string>();

  protected readonly visual = computed(() => estadoVisual(this.entidad(), this.estado()));
}
