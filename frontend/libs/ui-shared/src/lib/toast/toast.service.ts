import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Canal unico para mensajes transitorios de exito/error (reemplaza los
 * <p class="x__error">/<p class="x__estado"> ad-hoc que cada componente
 * repetia por su cuenta). Envuelve MessageService de PrimeNG -- mismo
 * criterio que ConfirmDialogService envolviendo ConfirmationService: el
 * componente que dispara el mensaje no conoce PrimeNG directamente.
 *
 * Requiere <nucleo-toast-host /> montado una sola vez en la raiz de la app
 * (ver ToastHostComponent), igual que ConfirmDialogHostComponent.
 *
 * `life` default de 4000ms para error/warn (dan tiempo a leer un mensaje
 * de negocio) y 3000ms para success/info (mas breves, no bloquean el
 * flujo).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messageService = inject(MessageService);

  success(detail: string, summary = 'Listo'): void {
    this.messageService.add({ severity: 'success', summary, detail, life: 3000 });
  }

  error(detail: string, summary = 'Error'): void {
    this.messageService.add({ severity: 'error', summary, detail, life: 4000 });
  }

  warn(detail: string, summary = 'Atención'): void {
    this.messageService.add({ severity: 'warn', summary, detail, life: 4000 });
  }

  info(detail: string, summary = 'Información'): void {
    this.messageService.add({ severity: 'info', summary, detail, life: 3000 });
  }
}
