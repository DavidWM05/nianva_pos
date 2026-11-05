import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

export interface ConfirmDialogOptions {
  message: string;
  header?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** 'danger' para acciones destructivas (anular, cancelar, eliminar). */
  severity?: 'danger' | 'info';
}

export interface ConfirmarEliminacionOptions {
  objeto: string;
  detalle?: string;
  accion?: 'eliminar' | 'anular';
}

const OBJETOS_ANULABLES = [
  'venta',
  'cotizacion',
  'apartado',
  'nota de credito',
  'gift card',
  'giftcard',
  'cuenta por cobrar',
  'cuenta por pagar',
  'nomina',
  'pedido',
  'orden de produccion',
  'prestamo',
  'devolucion',
];

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
 * El dialogo visual lo abre MatDialog; este servicio solo orquesta la
 * promesa. ConfirmDialogHostComponent se conserva por compatibilidad.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const data: ConfirmDialogData = {
      message: options.message,
      header: options.header ?? 'Confirmar',
      acceptLabel: options.acceptLabel ?? 'Aceptar',
      rejectLabel: options.rejectLabel ?? 'Cancelar',
      severity: options.severity === 'danger' ? 'danger' : 'info',
    };

    const referencia = this.dialog.open(ConfirmDialogComponent, {
      data,
      width: '28rem',
      delayFocusTrap: false,
    });

    referencia.afterOpened().subscribe(() => {
      document.querySelector<HTMLButtonElement>('button[data-cancelar]')?.focus();
    });

    return new Promise<boolean>((resolve) => {
      referencia.afterClosed().subscribe((resultado) => resolve(resultado === true));
    });
  }

  confirmarEliminacion(options: ConfirmarEliminacionOptions): Promise<boolean> {
    const accion = options.accion ?? (this.esAnulable(options.objeto) ? 'anular' : 'eliminar');
    const etiqueta = accion === 'anular' ? 'Anular' : 'Eliminar';

    return this.confirm({
      message: options.detalle ?? `¿${etiqueta} ${options.objeto}? Esta acción no se puede deshacer.`,
      header: `${etiqueta} ${options.objeto}`,
      acceptLabel: etiqueta,
      rejectLabel: 'Cancelar',
      severity: 'danger',
    });
  }

  private esAnulable(objeto: string): boolean {
    const normalizado = objeto
      .toLocaleLowerCase('es-MX')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    return OBJETOS_ANULABLES.some((candidato) => normalizado === candidato || normalizado.includes(candidato));
  }
}
