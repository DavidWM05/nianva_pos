import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';
import { ConfirmDialogService } from '@nucleo/ui-shared';

import { DispositivoConfiable } from '../seguridad.types';

/**
 * Lista simple (no nucleo-data-table): son a lo sumo un puñado de
 * dispositivos por usuario, sin paginacion server-side, y necesita una
 * columna de accion (revocar) que nucleo-data-table todavia no soporta
 * (su #body esta fijo a "una celda por columna", pensado para tablas de
 * datos de negocio -- ver su doc). Un listado propio es mas simple que
 * extender el componente compartido para un caso de uso que no se repite
 * en ningun otro modulo todavia.
 */
@Component({
  selector: 'nucleo-dispositivos-confiables-list',
  standalone: true,
  imports: [DatePipe, Button],
  templateUrl: './dispositivos-confiables-list.component.html',
  styleUrl: './dispositivos-confiables-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DispositivosConfiablesListComponent {
  private readonly confirmDialog = inject(ConfirmDialogService);

  @Input() dispositivos: DispositivoConfiable[] = [];
  @Input() cargando = false;

  @Output() revocar = new EventEmitter<number>();
  @Output() revocarTodos = new EventEmitter<void>();

  protected resumirUserAgent(userAgent: string | null): string {
    if (!userAgent) {
      return 'Dispositivo desconocido';
    }

    const navegador = /Edg\//.test(userAgent)
      ? 'Edge'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Navegador desconocido';

    const sistema = /Windows/.test(userAgent)
      ? 'Windows'
      : /Mac OS/.test(userAgent)
        ? 'macOS'
        : /Android/.test(userAgent)
          ? 'Android'
          : /iPhone|iPad/.test(userAgent)
            ? 'iOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : 'sistema desconocido';

    return `${navegador} en ${sistema}`;
  }

  async onRevocar(dispositivo: DispositivoConfiable): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Revocar el acceso confiado de "${this.resumirUserAgent(dispositivo.user_agent)}"? La próxima vez que inicie sesión desde ahí, se le pedirá el código de verificación de nuevo.`,
      header: 'Revocar dispositivo',
      severity: 'danger',
    });

    if (confirmado) {
      this.revocar.emit(dispositivo.id);
    }
  }

  async onRevocarTodos(): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: 'Se revocará el acceso confiado de TODOS tus dispositivos. En cada uno se pedirá el código de verificación en el próximo inicio de sesión.',
      header: 'Revocar todos los dispositivos',
      severity: 'danger',
    });

    if (confirmado) {
      this.revocarTodos.emit();
    }
  }
}
