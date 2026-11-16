import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { limitesDe } from '@nianva/api-contrato';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { CuponFormPayload } from '../cupon.service';
import { Cupon } from '../cupon.types';
import { numeroONulo } from '../numero-o-nulo';

/** Límites del cuerpo de la petición, leídos del contrato (UI-11b). */
const LIMITES = limitesDe('/cupones', 'post');

/**
 * Campos condicionales solo para el valor: porcentaje con tipo porcentaje y
 * monto con monto_fijo (DAT-02b); el resto de los campos no depende del tipo.
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
        defaultValue: this.valorInicial?.codigo ?? '',
        limite: LIMITES.codigo,
      },
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        defaultValue: this.valorInicial?.nombre ?? '',
        limite: LIMITES.nombre,
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
        name: 'porcentaje',
        label: 'Valor (%)',
        type: 'number',
        limite: LIMITES.porcentaje,
        required: true,
        dependsOn: { field: 'tipo', values: ['porcentaje'] },
        defaultValue: numeroONulo(this.valorInicial?.porcentaje),
      },
      {
        name: 'monto',
        label: 'Valor ($)',
        type: 'number',
        limite: LIMITES.monto,
        required: true,
        dependsOn: { field: 'tipo', values: ['monto_fijo'] },
        defaultValue: numeroONulo(this.valorInicial?.monto),
      },
      {
        name: 'uso_maximo',
        label: 'Uso máximo (total)',
        type: 'number',
        limite: LIMITES.uso_maximo,
        defaultValue: this.valorInicial?.uso_maximo ?? null,
      },
      {
        name: 'uso_maximo_por_cliente',
        label: 'Uso máximo por cliente',
        type: 'number',
        limite: LIMITES.uso_maximo_por_cliente,
        defaultValue: this.valorInicial?.uso_maximo_por_cliente ?? null,
      },
      {
        name: 'fecha_inicio',
        label: 'Vigente desde',
        type: 'date',
        defaultValue: this.valorInicial?.fecha_inicio
          ? new Date(this.valorInicial.fecha_inicio)
          : null,
      },
      {
        name: 'fecha_fin',
        label: 'Vigente hasta',
        type: 'date',
        defaultValue: this.valorInicial?.fecha_fin
          ? new Date(this.valorInicial.fecha_fin)
          : null,
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    const fecha = (valor: unknown): string | null => {
      if (!valor) return null;
      return valor instanceof Date
        ? valor.toISOString().slice(0, 10)
        : String(valor);
    };

    const tipo = value['tipo'] as CuponFormPayload['tipo'];

    // Solo el campo del tipo: el otro va null aunque el formulario conserve lo escrito.
    this.guardar.emit({
      codigo: String(value['codigo'] ?? ''),
      nombre: String(value['nombre'] ?? ''),
      tipo,
      porcentaje: tipo === 'porcentaje' ? numeroONulo(value['porcentaje']) : null,
      monto: tipo === 'monto_fijo' ? numeroONulo(value['monto']) : null,
      uso_maximo: value['uso_maximo'] as number | null,
      uso_maximo_por_cliente: value['uso_maximo_por_cliente'] as number | null,
      fecha_inicio: fecha(value['fecha_inicio']),
      fecha_fin: fecha(value['fecha_fin']),
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
