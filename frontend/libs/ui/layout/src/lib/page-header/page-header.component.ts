import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { REGISTRO_NAVEGACION, buscarEntrada } from '../navegacion/registro-navegacion';

/**
 * Encabezado de pagina (UI-08): el icono y el nombre salen del registro de
 * navegacion por `clave`. No tiene entrada de titulo a proposito, para que
 * una pantalla no pueda escribir su nombre a mano.
 *
 *   <ui-page-header clave="crm" subtitulo="Personas y empresas que te compran">
 *     <ui-btn-crear acciones objeto="cliente" ruta="/crm/nuevo" />
 *   </ui-page-header>
 */
@Component({
  selector: 'ui-page-header',
  standalone: true,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  private readonly registro = inject(REGISTRO_NAVEGACION);

  readonly clave = input.required<string>();
  readonly subtitulo = input<string | null>(null);

  protected readonly entrada = computed(() => {
    const entrada = buscarEntrada(this.registro, this.clave());

    if (!entrada) {
      throw new Error(`ui-page-header: la clave "${this.clave()}" no esta en el registro de navegacion.`);
    }

    return entrada;
  });
}
