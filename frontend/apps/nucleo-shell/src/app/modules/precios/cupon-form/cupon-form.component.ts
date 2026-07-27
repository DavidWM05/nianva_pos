import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';

import { CuponFormPayload } from '../cupon.service';
import { Cupon } from '../cupon.types';

/**
 * Sin campos condicionales -- a diferencia de ReglaPrecioFormComponent,
 * un cupon siempre tiene los mismos campos sin importar su tipo.
 */
@Component({
  selector: 'nucleo-cupon-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './cupon-form.component.html',
  styleUrl: './cupon-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuponFormComponent implements OnChanges {
  @Input() valorInicial: Cupon | null = null;
  @Input() submitLabel = 'Guardar';
  /** Modo visualizar (ver el reporte del punto 1): mismo formulario, deshabilitado, sin boton de guardar. */
  @Input() readonly = false;

  @Output() guardar = new EventEmitter<CuponFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(): void {
    this.fields = [
      {
        name: 'codigo',
        label: 'Código',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial?.codigo ?? '',
        maxLength: 50,
      },
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial?.nombre ?? '',
        maxLength: 120,
      },
      {
        name: 'tipo',
        label: 'Tipo',
        type: 'select',
        required: true,
        options: [
          { label: 'Porcentaje', value: 'porcentaje' },
          { label: 'Monto fijo', value: 'monto_fijo' },
        ],
        defaultValue: this.valorInicial?.tipo ?? 'porcentaje',
      },
      {
        name: 'valor',
        label: 'Valor',
        type: 'number',
        required: true,
        validators: [Validators.min(0)],
        defaultValue: this.valorInicial?.valor ?? null,
      },
      {
        name: 'uso_maximo',
        label: 'Uso máximo (total)',
        type: 'number',
        validators: [Validators.min(1)],
        defaultValue: this.valorInicial?.uso_maximo ?? null,
      },
      {
        name: 'uso_maximo_por_cliente',
        label: 'Uso máximo por cliente',
        type: 'number',
        validators: [Validators.min(1)],
        defaultValue: this.valorInicial?.uso_maximo_por_cliente ?? null,
      },
      {
        name: 'fecha_inicio',
        label: 'Vigente desde',
        type: 'date',
        defaultValue: this.valorInicial?.fecha_inicio ? new Date(this.valorInicial.fecha_inicio) : null,
      },
      {
        name: 'fecha_fin',
        label: 'Vigente hasta',
        type: 'date',
        defaultValue: this.valorInicial?.fecha_fin ? new Date(this.valorInicial.fecha_fin) : null,
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    const fecha = (valor: unknown): string | null => {
      if (!valor) return null;
      return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor);
    };

    this.guardar.emit({
      ...(value as unknown as CuponFormPayload),
      fecha_inicio: fecha(value['fecha_inicio']),
      fecha_fin: fecha(value['fecha_fin']),
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
