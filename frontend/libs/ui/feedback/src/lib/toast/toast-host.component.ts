import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Se conserva el selector `nucleo-toast-host` porque apps/pos lo monta en
 * su raiz y ui-shared lo reexporta. ToastService ya no necesita un host:
 * MatSnackBar crea el overlay por su cuenta.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'nucleo-toast-host',
  standalone: true,
  template: `<ng-container />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHostComponent {}
