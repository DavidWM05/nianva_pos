import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { ClienteFormPayload } from '../cliente.service';
import { Cliente } from '../cliente.types';

/**
 * Reutilizado por la vista de creacion (sin valorInicial, ver
 * ClienteCrearComponent) y por la pestana General de la vista de registro
 * (con valorInicial, y con `readonly` cuando falta el permiso de editar) --
 * mismos campos, mismas validaciones, un solo lugar que las declara.
 */
@Component({
  selector: 'nucleo-cliente-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteFormComponent implements OnChanges {
  @Input() valorInicial: Cliente | null = null;
  @Input() submitLabel = 'Guardar';
  /** Modo visualizar (ver el reporte del punto 1): mismo formulario, deshabilitado, sin boton de guardar. */
  @Input() readonly = false;

  @Output() guardar = new EventEmitter<ClienteFormPayload>();

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
        maxLength: 200,
      },
      {
        name: 'documento_fiscal',
        label: 'Documento fiscal',
        type: 'text',
        defaultValue: this.valorInicial?.documento_fiscal ?? '',
        maxLength: 30,
      },
      {
        name: 'telefono',
        label: 'Teléfono',
        type: 'text',
        defaultValue: this.valorInicial?.telefono ?? '',
        maxLength: 20,
      },
      {
        name: 'correo',
        label: 'Correo',
        type: 'text',
        validators: [Validators.email],
        defaultValue: this.valorInicial?.correo ?? '',
        maxLength: 150,
      },
      { name: 'direccion', label: 'Dirección', type: 'textarea', defaultValue: this.valorInicial?.direccion ?? '' },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit(value as unknown as ClienteFormPayload);
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
