import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { VarianteFormPayload } from '../producto.service';
import { ProductoVariante } from '../producto.types';

/**
 * Talla/color/codigo_barras -- usado para crear una variante nueva
 * (modal, sin valorInicial) y para editar una existente. El codigo de
 * barras se maneja como texto plano (ver decision en el reporte: no se
 * renderiza un codigo visual real para no sumar una libreria nueva).
 */
@Component({
  selector: 'nucleo-variante-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './variante-form.component.html',
  styleUrl: './variante-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VarianteFormComponent implements OnChanges {
  @Input() valorInicial: ProductoVariante | null = null;
  @Input() submitLabel = 'Guardar';
  /**
   * Configuracion.editar -> codigo_barras_automatico (ver
   * ProductoDetalleComponent, que lo lee via ConfiguracionService.publica()
   * y lo pasa aqui). Si esta activo, el campo se muestra deshabilitado --
   * el valor lo pone el backend (variante nueva, ver
   * ProductoVarianteController::generarCodigoBarrasUnico()) o ya lo trae
   * `valorInicial` (variante existente); el usuario nunca lo escribe a mano.
   */
  @Input() codigoBarrasAutomatico = false;

  @Output() guardar = new EventEmitter<VarianteFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(): void {
    this.fields = [
      { name: 'talla', label: 'Talla', type: 'text', defaultValue: this.valorInicial?.talla ?? '', maxLength: 30 },
      { name: 'color', label: 'Color', type: 'text', defaultValue: this.valorInicial?.color ?? '', maxLength: 30 },
      {
        name: 'codigo_barras',
        label: 'Código de barras',
        type: 'text',
        placeholder: this.codigoBarrasAutomatico && !this.valorInicial?.codigo_barras ? 'Se genera al guardar' : undefined,
        defaultValue: this.valorInicial?.codigo_barras ?? '',
        maxLength: 50,
        readonly: this.codigoBarrasAutomatico,
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit(value as unknown as VarianteFormPayload);
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
