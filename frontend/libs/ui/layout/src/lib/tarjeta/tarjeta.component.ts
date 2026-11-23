import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * Lista de tarjetas: la forma de una tabla editable en pantalla angosta (UI-04), por ejemplo el
 * carrito del TPV. El host es la propia lista y cada elemento lleva `uiTarjeta`.
 *
 *   <ul uiTarjetas aria-label="Líneas del carrito">
 *     <li uiTarjeta>
 *       <h4 class="ui-tarjeta__titulo">Línea 1: Agua 1L</h4>
 *       <dl uiDatos>…</dl>
 *       <div class="ui-tarjeta__pie"><label>Cantidad <input /></label> <button …></div>
 *     </li>
 *   </ul>
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- el host es la propia lista.
  selector: '[uiTarjetas]',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tarjeta.component.scss',
  // Sin encapsulacion: titulo, pie y etiquetas son contenido proyectado.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-tarjetas',
    '[class.ui-tarjetas--resumen]': "disposicion() === 'resumen'",
    '[class.ui-tarjetas--paneles]': "disposicion() === 'paneles'",
  },
})
export class TarjetasComponent {
  readonly disposicion = input<'lista' | 'resumen' | 'paneles'>('lista');
}

/** Una tarjeta de la lista: borde, relleno, titulo (`ui-tarjeta__titulo`) y pie (`ui-tarjeta__pie`). */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- el host es el propio elemento.
  selector: '[uiTarjeta]',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './tarjeta.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-tarjeta' },
})
export class TarjetaComponent {}
