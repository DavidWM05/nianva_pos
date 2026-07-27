import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';

import { ProveedorFormPayload } from '../compra.service';

/**
 * Alta rapida de proveedor -- solo razon_social (unico campo obligatorio
 * en el backend, ver ProveedorController::store()). Prerrequisito para
 * poder registrar una compra (ver CompraFormComponent): antes de esto no
 * existia ningun lugar del sistema donde crear un proveedor.
 */
@Component({
  selector: 'nucleo-proveedor-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './proveedor-form.component.html',
  styleUrl: './proveedor-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProveedorFormComponent implements OnInit {
  @Output() guardar = new EventEmitter<ProveedorFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnInit(): void {
    this.fields = [{ name: 'razon_social', label: 'Razón social', type: 'text', required: true, maxLength: 200 }];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit(value as unknown as ProveedorFormPayload);
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
