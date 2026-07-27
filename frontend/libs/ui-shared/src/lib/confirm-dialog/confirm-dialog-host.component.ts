import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ConfirmDialog } from 'primeng/confirmdialog';

/**
 * Montar UNA sola vez en la raiz de la app (ej. app.html). El servicio
 * ConfirmDialogService dispara el contenido; este componente solo aloja el
 * overlay visual de PrimeNG.
 */
@Component({
  selector: 'nucleo-confirm-dialog-host',
  standalone: true,
  imports: [ConfirmDialog],
  template: `<p-confirmdialog />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogHostComponent {}
