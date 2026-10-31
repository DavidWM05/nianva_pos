import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { MetodoPagoFormPayload } from '../metodo-pago-admin.service';
import { MetodoPagoAdmin } from '../metodo-pago.types';

const OPCIONES_TIPO: { label: string; value: string }[] = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Tarjeta', value: 'tarjeta' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Digital', value: 'digital' },
  { label: 'Otro', value: 'otro' },
];

/**
 * Reutilizado por la vista de creacion (sin valorInicial, ver
 * MetodoPagoCrearComponent) y por la pestana General de la vista de
 * registro. `readonly` se activa tanto por falta de permiso como por ser
 * una fila del catalogo global (es_global) -- ver
 * MetodoPagoDetalleComponent, que decide cual de las dos razones mostrar.
 */
@Component({
  selector: 'nucleo-metodo-pago-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './metodo-pago-form.component.html',
  styleUrl: './metodo-pago-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetodoPagoFormComponent implements OnChanges {
  @Input() valorInicial: MetodoPagoAdmin | null = null;
  @Input() submitLabel = 'Guardar';
  @Input() readonly = false;

  @Output() guardar = new EventEmitter<MetodoPagoFormPayload>();

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
        maxLength: 80,
      },
      {
        name: 'tipo',
        label: 'Tipo',
        type: 'select',
        required: true,
        options: OPCIONES_TIPO,
        defaultValue: this.valorInicial?.tipo ?? 'efectivo',
      },
      {
        name: 'incluir_en_financiero',
        label: 'Incluir en el corte financiero',
        type: 'checkbox',
        defaultValue: this.valorInicial?.incluir_en_financiero ?? true,
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit(value as unknown as MetodoPagoFormPayload);
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
