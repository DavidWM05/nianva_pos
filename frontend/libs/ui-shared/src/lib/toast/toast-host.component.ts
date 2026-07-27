import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Toast } from 'primeng/toast';

/**
 * Montar UNA sola vez en la raiz de la app (ver app.html). ToastService
 * dispara el contenido; este componente solo aloja el overlay visual de
 * PrimeNG -- mismo patron que ConfirmDialogHostComponent.
 */
@Component({
  selector: 'nucleo-toast-host',
  standalone: true,
  imports: [Toast],
  template: `<p-toast />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHostComponent {}
