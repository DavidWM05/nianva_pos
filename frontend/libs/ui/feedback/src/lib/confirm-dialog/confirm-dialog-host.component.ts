import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Se conserva el selector `nucleo-confirm-dialog-host` porque apps/pos lo
 * monta en su raiz y ui-shared lo reexporta. El dialogo lo abre MatDialog
 * desde ConfirmDialogService.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'nucleo-confirm-dialog-host',
  standalone: true,
  template: `<ng-container />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogHostComponent {}
