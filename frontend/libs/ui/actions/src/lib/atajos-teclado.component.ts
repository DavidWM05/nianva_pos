import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/** Un atajo de teclado: las teclas que lo disparan (cualquiera de ellas) y lo que hace. */
export interface AtajoTeclado {
  teclas: readonly string[];
  accion: string;
}

/**
 * Lista de los atajos de teclado de una pantalla, a la vista y con nombre accesible (UI-17). Cada
 * tecla va en su `<kbd>`; varias teclas del mismo atajo se separan con una barra.
 *
 *   <ui-atajos-teclado [atajos]="[{ teclas: ['F2'], accion: 'Buscar producto' }]" />
 */
@Component({
  selector: 'ui-atajos-teclado',
  standalone: true,
  template: `
    <ul class="ui-atajos-teclado" aria-label="Atajos de teclado">
      @for (atajo of atajos(); track atajo.accion) {
        <li>
          @for (tecla of atajo.teclas; track tecla; let ultima = $last) {
            <kbd>{{ tecla }}</kbd>@if (!ultima) { / }
          }
          {{ atajo.accion }}
        </li>
      }
    </ul>
  `,
  styleUrl: './atajos-teclado.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtajosTecladoComponent {
  readonly atajos = input.required<readonly AtajoTeclado[]>();
}
