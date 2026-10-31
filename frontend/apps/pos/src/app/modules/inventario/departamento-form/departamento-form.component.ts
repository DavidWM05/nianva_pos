import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { DepartamentoFormPayload } from '../departamento.service';
import { Departamento } from '../departamento.types';

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

  @Output() guardar = new EventEmitter<DepartamentoFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(): void {
    this.fields = [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial?.nombre ?? '',
        maxLength: 120,
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
    this.guardar.emit(value as unknown as DepartamentoFormPayload);
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
