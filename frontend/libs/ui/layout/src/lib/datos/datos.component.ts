import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';

import { PantallaService } from '../shell/pantalla.service';

/**
 * Lista de definiciones (pares dt/dd) con el espaciado y la jerarquía del
 * sistema de diseño. El host es el propio `<dl>`.
 *
 *   <dl uiDatos>
 *     <dt>Tipo</dt>
 *     <dd>saas</dd>
 *   </dl>
 *
 * En pantalla angosta pasa a una columna con `PantallaService` (UI-04), sin
 * `@media` propio.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- el host es el propio dl.
  selector: 'dl[uiDatos]',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './datos.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-datos', '[class.ui-datos--angosta]': 'angosta()' },
})
export class DatosComponent {
  protected readonly angosta = inject(PantallaService).angosta;
}
