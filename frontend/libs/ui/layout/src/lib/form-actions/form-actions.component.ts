import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Barra de botones al pie de un formulario: alineados a la derecha, el
 * primario al final. En pantallas angostas se apilan a lo ancho.
 */
@Component({
  selector: 'ui-form-actions',
  standalone: true,
  template: `<div class="ui-form-actions"><ng-content /></div>`,
  styleUrl: './form-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormActionsComponent {}
