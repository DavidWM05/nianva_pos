import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Contenedor tactil (UI-04): el TPV se opera con el dedo, tambien en terminales de pantalla ancha.
 * Dentro de el, los botones de Material, los botones de icono y los controles nativos miden al
 * menos 44 px de alto (WCAG 2.5.5). Los inputs de Material conservan el alto de su
 * mat-form-field.
 *
 *   <div uiTactil>…</div>
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- se aplica sobre un contenedor.
  selector: '[uiTactil]',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tactil.component.scss',
  // Sin encapsulacion: los botones y controles son contenido proyectado.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-tactil' },
})
export class TactilComponent {}
