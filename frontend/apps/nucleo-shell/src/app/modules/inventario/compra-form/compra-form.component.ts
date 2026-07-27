import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';

import { ProveedorSimple } from '../producto.types';

export interface CompraFormValue {
  proveedor_id: number;
  cantidad: number;
  precio_compra: number;
  numero_comprobante?: string | null;
}

/**
 * Registra una entrada de stock (compra) para UNA variante -- la variante
 * la decide el componente padre (ver ProductoDetalleComponent) por
 * contexto (que fila de VariantesListComponent disparo la accion), no es
 * un campo de este formulario. `proveedores` llega por @Input (poblado por
 * el padre via CompraService.proveedores()) -- si esta vacio, el select
 * queda sin opciones y el campo requerido bloquea el submit; el padre debe
 * ofrecer "Nuevo proveedor" (ver ProveedorFormComponent) antes de esto.
 */
@Component({
  selector: 'nucleo-compra-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './compra-form.component.html',
  styleUrl: './compra-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompraFormComponent implements OnChanges {
  @Input() submitLabel = 'Registrar compra';
  @Input({ required: true }) proveedores!: ProveedorSimple[];

  @Output() guardar = new EventEmitter<CompraFormValue>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(): void {
    this.fields = [
      {
        name: 'proveedor_id',
        label: 'Proveedor',
        type: 'select',
        required: true,
        options: this.proveedores.map((p) => ({ label: p.razon_social, value: p.id })),
      },
      { name: 'cantidad', label: 'Cantidad', type: 'number', required: true, validators: [Validators.min(1)] },
      {
        name: 'precio_compra',
        label: 'Precio de compra (unitario)',
        type: 'number',
        required: true,
        validators: [Validators.min(0)],
      },
      { name: 'numero_comprobante', label: 'N° de comprobante (opcional)', type: 'text', maxLength: 60 },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit(value as unknown as CompraFormValue);
  }

  /**
   * El backend valida `items.*.cantidad`/`items.*.precio_compra`/
   * `proveedor_id` (ver CompraController) -- las claves nested (`items.0.cantidad`)
   * no coinciden con los nombres planos de este formulario, se remapean
   * antes de llegar aqui (ver ProductoDetalleComponent.onGuardarCompra()).
   */
  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
