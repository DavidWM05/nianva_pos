import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';

export type TipoAccion =
  | 'ver'
  | 'editar'
  | 'imprimir'
  | 'historial'
  | 'estado'
  | 'eliminar'
  | 'anular'
  | 'custom';

export type AccionFila =
  | { tipo: Exclude<TipoAccion, 'estado' | 'custom'>; motivoDeshabilitada?: string }
  | { tipo: 'estado'; activo: boolean; motivoDeshabilitada?: string }
  | { tipo: 'custom'; id: string; icono: string; descripcion: string; motivoDeshabilitada?: string };

export type AccionEmitida = { tipo: Exclude<TipoAccion, 'custom'> } | { tipo: 'custom'; id: string };

interface AccionInterna {
  tipo: TipoAccion;
  etiqueta: string;
  icono: string;
  tono: 'secondary' | 'danger';
  motivoDeshabilitada?: string;
  orden: number;
  indice: number;
  id?: string;
  activo?: boolean;
}

interface MenuAccion {
  label: string;
  icon: string;
  disabled: boolean;
  command: () => void;
  accion: AccionInterna;
}

@Component({
  selector: 'ui-row-actions',
  standalone: true,
  imports: [MatIconButton, MatMenuModule, MatTooltip],
  templateUrl: './row-actions.component.html',
  styleUrl: './row-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RowActionsComponent {
  readonly acciones = input.required<readonly AccionFila[]>();
  readonly accion = output<AccionEmitida>();

  protected readonly accionesOrdenadas = computed(() => {
    return this.acciones()
      .map((accion, indice) => this.normalizar(accion, indice))
      .sort((a, b) => a.orden - b.orden || a.indice - b.indice);
  });

  protected readonly visibles = computed(() => {
    const acciones = this.accionesOrdenadas();

    return acciones.length > 3 ? acciones.slice(0, 2) : acciones;
  });

  protected readonly menuItems = computed<MenuAccion[]>(() => {
    const acciones = this.accionesOrdenadas();

    return acciones.length > 3
      ? acciones.slice(2).map((accion) => ({
          label: accion.motivoDeshabilitada
            ? `${accion.etiqueta} — ${accion.motivoDeshabilitada}`
            : accion.etiqueta,
          icon: accion.icono,
          disabled: Boolean(accion.motivoDeshabilitada),
          command: () => this.ejecutar(accion),
          accion,
        }))
      : [];
  });

  protected ejecutar(accion: AccionInterna): void {
    if (accion.motivoDeshabilitada) {
      return;
    }

    if (accion.tipo === 'custom' && accion.id !== undefined) {
      this.accion.emit({ tipo: 'custom', id: accion.id });

      return;
    }

    this.accion.emit({ tipo: accion.tipo as Exclude<TipoAccion, 'custom'> });
  }

  protected aria(accion: AccionInterna): string {
    return accion.motivoDeshabilitada ? `${accion.etiqueta}: ${accion.motivoDeshabilitada}` : accion.etiqueta;
  }

  private normalizar(accion: AccionFila, indice: number): AccionInterna {
    if (accion.tipo === 'custom') {
      return {
        tipo: 'custom',
        etiqueta: accion.descripcion,
        icono: accion.icono,
        tono: 'secondary',
        motivoDeshabilitada: accion.motivoDeshabilitada,
        orden: 4,
        indice,
        id: accion.id,
      };
    }

    if (accion.tipo === 'estado') {
      return {
        tipo: 'estado',
        etiqueta: accion.activo ? 'Desactivar' : 'Activar',
        icono: accion.activo ? 'pi pi-ban' : 'pi pi-check-circle',
        tono: 'secondary',
        motivoDeshabilitada: accion.motivoDeshabilitada,
        orden: 5,
        indice,
        activo: accion.activo,
      };
    }

    const visual: Record<Exclude<TipoAccion, 'estado' | 'custom'>, { etiqueta: string; icono: string; tono: 'secondary' | 'danger'; orden: number }> = {
      ver: { etiqueta: 'Ver', icono: 'pi pi-eye', tono: 'secondary', orden: 0 },
      editar: { etiqueta: 'Editar', icono: 'pi pi-pencil', tono: 'secondary', orden: 1 },
      imprimir: { etiqueta: 'Imprimir', icono: 'pi pi-print', tono: 'secondary', orden: 2 },
      historial: { etiqueta: 'Historial', icono: 'pi pi-history', tono: 'secondary', orden: 3 },
      eliminar: { etiqueta: 'Eliminar', icono: 'pi pi-trash', tono: 'danger', orden: 6 },
      anular: { etiqueta: 'Anular', icono: 'pi pi-times-circle', tono: 'danger', orden: 7 },
    };

    return {
      tipo: accion.tipo,
      ...visual[accion.tipo],
      motivoDeshabilitada: accion.motivoDeshabilitada,
      indice,
    };
  }
}
