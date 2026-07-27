import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';

import { CategoriaFormPayload } from '../categoria.service';
import { Categoria } from '../categoria.types';

/**
 * Reutilizado por la vista de creacion (sin valorInicial, ver
 * CategoriaCrearComponent) y por la pestana General de la vista de
 * registro (con valorInicial, y con `readonly` cuando falta el permiso de
 * editar) -- mismo patron que ClienteFormComponent en Crm.
 */
@Component({
  selector: 'nucleo-categoria-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './categoria-form.component.html',
  styleUrl: './categoria-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriaFormComponent implements OnChanges {
  @Input() valorInicial: Categoria | null = null;
  @Input() submitLabel = 'Guardar';
  @Input() readonly = false;

  @Output() guardar = new EventEmitter<CategoriaFormPayload>();

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
    this.guardar.emit(value as unknown as CategoriaFormPayload);
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
