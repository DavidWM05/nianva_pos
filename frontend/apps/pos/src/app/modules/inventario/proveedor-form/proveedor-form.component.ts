import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { limitesDe } from '@nianva/api-contrato';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { ProveedorFormPayload } from '../compra.service';

/** Límites del cuerpo de la petición, leídos del contrato (UI-11b). */
const LIMITES = limitesDe('/proveedores', 'post');

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProveedorFormComponent implements OnInit {
  @Input() enviando = false;

  @Output() guardar = new EventEmitter<ProveedorFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnInit(): void {
    this.fields = [
      {
        name: 'razon_social',
        label: 'Razón social',
        type: 'text',
        limite: LIMITES.razon_social,
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit({ razon_social: value['razon_social'] as string });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
