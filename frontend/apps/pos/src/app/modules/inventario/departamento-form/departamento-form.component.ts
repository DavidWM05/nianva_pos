import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { limitesDe } from '@nianva/api-contrato';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { Departamento, DepartamentoFormPayload } from '@nianva/domain-inventario';

/** Límites del cuerpo de la petición, leídos del contrato (UI-11b). */
const LIMITES = limitesDe('/departamentos', 'post');

/**
 * Reutilizado por la vista de creacion (sin valorInicial, ver
 * DepartamentoCrearComponent) y por la pestana General de la vista de
 * registro (con valorInicial, y con `readonly` cuando falta el permiso
 * de editar) -- mismo patron que CategoriaFormComponent.
 */
@Component({
  selector: 'nucleo-departamento-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './departamento-form.component.html',
  styleUrl: './departamento-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentoFormComponent implements OnChanges {
  @Input() valorInicial: Departamento | null = null;
  @Input() submitLabel = 'Guardar';
  @Input() readonly = false;
  @Input() enviando = false;

  @Output() guardar = new EventEmitter<DepartamentoFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(cambios?: SimpleChanges): void {
    if (cambios && this.fields.length > 0 && !cambios['valorInicial']) return;
    this.fields = [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        defaultValue: this.valorInicial?.nombre ?? '',
        limite: LIMITES.nombre,
      },
      {
        name: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        defaultValue: this.valorInicial?.descripcion ?? '',
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit({
      nombre: value['nombre'] as string,
      descripcion: value['descripcion'] as string | null,
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
