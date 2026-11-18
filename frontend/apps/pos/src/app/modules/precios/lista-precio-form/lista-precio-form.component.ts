import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';
import { limitesDe } from '@nianva/api-contrato';
import type { ListaPrecio } from '@nianva/domain-precios';

/** Limites del contrato de POST /precios/listas (UI-11b). */
const LIMITES = limitesDe('/precios/listas', 'post');

@Component({
  selector: 'nucleo-lista-precio-form',
  standalone: true,
  imports: [DynamicFormComponent],
  template:
    '<nucleo-dynamic-form [fields]="fields" [readonly]="readonly" [enviando]="enviando" (formSubmit)="enviar($event)" />',
})
export class ListaPrecioFormComponent implements OnChanges {
  @Input() valorInicial: ListaPrecio | null = null;
  @Input() readonly = false;
  @Input() enviando = false;
  @Output() guardar = new EventEmitter<{ nombre: string }>();
  @ViewChild(DynamicFormComponent) private formulario?: DynamicFormComponent;
  protected fields: DynamicFormField[] = [];
  ngOnChanges(cambios?: SimpleChanges): void {
    if (this.fields.length > 0 && !cambios?.['valorInicial']) return;
    this.fields = [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        limite: LIMITES.nombre,
        defaultValue: this.valorInicial?.nombre ?? '',
      },
    ];
  }
  enviar(datos: Record<string, unknown>): void {
    if (typeof datos['nombre'] === 'string')
      this.guardar.emit({ nombre: datos['nombre'] });
  }
  setServerErrors(errores: Record<string, string | string[]>): void {
    this.formulario?.setServerErrors(errores);
  }
}
