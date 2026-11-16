import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { EntidadSelectorComponent } from '@nianva/ui-shared';
import { BUSCADOR_LISTA_PRECIO } from '../../../core/buscadores-entidad.tokens';
@Component({
  selector: 'nucleo-selector-lista-precio',
  standalone: true,
  imports: [EntidadSelectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<nucleo-entidad-selector [buscador]="buscador" label="Lista de precio" placeholder="Usar lista del cliente" [valorInicial]="valorInicial" (seleccionado)="seleccionado.emit($event)" />',
})
export class SelectorListaPrecioComponent {
  protected readonly buscador = inject(BUSCADOR_LISTA_PRECIO);
  @Input() valorInicial: number | null = null;
  @Output() seleccionado = new EventEmitter<number | null>();
}
