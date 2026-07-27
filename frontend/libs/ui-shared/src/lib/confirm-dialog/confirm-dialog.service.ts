import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmDialogOptions {
  message: string;
  header?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** 'danger' para acciones destructivas (anular, cancelar, eliminar). */
  severity?: 'danger' | 'info';
}

/**
 * Reemplaza cualquier confirm() de JavaScript. Uso:
 *
 *   const ok = await this.confirmDialog.confirm({
 *     message: 'Esta accion no se puede deshacer.',
 *     header: 'Anular venta',
 *     severity: 'danger',
 *   });
 *   if (!ok) return;
 *
 * Requiere que <nucleo-confirm-dialog-host /> este montado una sola vez en
 * la raiz de la app (ver ConfirmDialogHostComponent) -- de ahi sale el
 * dialogo visual; este servicio solo orquesta la promesa.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly confirmationService = inject(ConfirmationService);

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmationService.confirm({
        message: options.message,
        header: options.header ?? 'Confirmar',
        icon: options.severity === 'danger' ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptLabel: options.acceptLabel ?? 'Aceptar',
        rejectLabel: options.rejectLabel ?? 'Cancelar',
        acceptButtonProps: {
          severity: options.severity === 'danger' ? 'danger' : 'primary',
        },
        rejectButtonProps: {
          severity: 'secondary',
          outlined: true,
        },
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
