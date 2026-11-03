import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

type Severidad = 'success' | 'error' | 'warn' | 'info';

/** Un mismo mensaje repetido dentro de esta ventana se muestra una sola vez. */
export const VENTANA_DUPLICADOS_MS = 1500;

/**
 * Canal unico para mensajes transitorios de exito/error (UI-13). Envuelve
 * MessageService de PrimeNG -- mismo criterio que ConfirmDialogService
 * envolviendo ConfirmationService: el componente que dispara el mensaje no
 * conoce PrimeNG directamente.
 *
 * Requiere <nucleo-toast-host /> montado una sola vez en la raiz de la app
 * (ver ToastHostComponent), igual que ConfirmDialogHostComponent.
 *
 * `life` default de 4000ms para error/warn (dan tiempo a leer un mensaje
 * de negocio) y 3000ms para success/info (mas breves, no bloquean el
 * flujo). El mismo mensaje con la misma severidad dentro de
 * VENTANA_DUPLICADOS_MS no se repite: varias peticiones que fallan igual
 * producen un solo toast.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messageService = inject(MessageService);
  private readonly mostrados = new Map<string, number>();
  private ultimoErrorTecnico = 0;

  success(detail: string, summary = 'Listo'): void {
    this.mostrar('success', summary, detail, 3000);
  }

  error(detail: string, summary = 'Error'): void {
    if (Date.now() - this.ultimoErrorTecnico < VENTANA_DUPLICADOS_MS) {
      return;
    }

    this.mostrar('error', summary, detail, 4000);
  }

  errorTecnico(detail: string, correlationId?: string): void {
    const mensaje = correlationId ? `${detail} Código de soporte: ${correlationId}` : detail;

    this.ultimoErrorTecnico = Date.now();
    this.mostrar('error', 'Error', mensaje, 4000);
  }

  warn(detail: string, summary = 'Atención'): void {
    this.mostrar('warn', summary, detail, 4000);
  }

  info(detail: string, summary = 'Información'): void {
    this.mostrar('info', summary, detail, 3000);
  }

  private mostrar(severity: Severidad, summary: string, detail: string, life: number): void {
    const ahora = Date.now();
    const clave = `${severity}|${summary}|${detail}`;
    const anterior = this.mostrados.get(clave);

    if (anterior !== undefined && ahora - anterior < VENTANA_DUPLICADOS_MS) {
      return;
    }

    this.mostrados.set(clave, ahora);
    this.messageService.add({ severity, summary, detail, life });
  }
}
