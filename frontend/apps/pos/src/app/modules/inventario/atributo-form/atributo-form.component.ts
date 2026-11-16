import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { limitesDe } from '@nianva/api-contrato';
import type { Atributo, AtributoPayload } from '@nianva/domain-inventario';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

/** Límites del cuerpo de la petición, leídos del contrato (UI-11b). */
const LIMITES = limitesDe('/atributos', 'post');

/**
 * Datos generales de un atributo de variante (ARQ-07): nombre y orden en el nombre armado de la
 * variante. Lo usan la vista nueva (sin valorInicial) y la pestaña General del registro.
 */
@Component({
  selector: 'nucleo-atributo-form',
  standalone: true,
  imports: [DynamicFormComponent],
  template:
    '<nucleo-dynamic-form [fields]="fields" [submitLabel]="submitLabel" [readonly]="readonly" [enviando]="enviando" (formSubmit)="enviar($event)" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtributoFormComponent implements OnChanges {
  @Input() valorInicial: Atributo | null = null;
  @Input() submitLabel = 'Guardar';
  @Input() readonly = false;
  @Input() enviando = false;

  @Output() guardar = new EventEmitter<AtributoPayload>();

  @ViewChild(DynamicFormComponent) private formulario?: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(cambios?: SimpleChanges): void {
    if (this.fields.length > 0 && !cambios?.['valorInicial']) return;
    this.fields = [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        defaultValue: this.valorInicial?.nombre ?? '',
        limite: LIMITES.nombre,
      },
      {
        name: 'orden',
        label: 'Orden en el nombre de la variante',
        type: 'number',
        defaultValue: this.valorInicial?.orden ?? 0,
        limite: LIMITES.orden,
      },
    ];
  }

  enviar(datos: Record<string, unknown>): void {
    const orden = datos['orden'];
    this.guardar.emit({
      nombre: String(datos['nombre'] ?? ''),
      orden: orden === null || orden === '' || orden === undefined ? null : Number(orden),
    });
  }

  setServerErrors(errores: Record<string, string | string[]>): void {
    this.formulario?.setServerErrors(errores);
  }
}
