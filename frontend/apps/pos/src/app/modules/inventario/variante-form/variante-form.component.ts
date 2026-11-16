import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { limitesDe } from '@nianva/api-contrato';
import {
  CampoComponent,
  InputDineroComponent,
  aplicarErroresServidor,
} from '@nianva/ui-forms';
import { aCentavos } from '@nianva/ui-format';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { VarianteFormPayload } from '../producto.service';
import { ProductoVariante } from '../producto.types';

/** Límites del cuerpo de la petición, leídos del contrato (UI-11b). */
const LIMITES = limitesDe('/productos/{producto}/variantes', 'post');

/**
 * Talla/color/codigo_barras -- usado para crear una variante nueva
 * (modal, sin valorInicial) y para editar una existente. El codigo de
 * barras se maneja como texto plano (ver decision en el reporte: no se
 * renderiza un codigo visual real para no sumar una libreria nueva).
 */
@Component({
  selector: 'nucleo-variante-form',
  standalone: true,
  imports: [
    DynamicFormComponent,
    ReactiveFormsModule,
    CampoComponent,
    InputDineroComponent,
  ],
  templateUrl: './variante-form.component.html',
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

  @Input() enviando = false;

  @Output() guardar = new EventEmitter<VarianteFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected readonly importes = new FormGroup({
    precio_venta: new FormControl<number | null>(null, [
      Validators.min(LIMITES.precio_venta.minimum),
      Validators.max(LIMITES.precio_venta.maximum),
    ]),
    costo: new FormControl<number | null>(null, [
      Validators.min(LIMITES.costo.minimum),
      Validators.max(LIMITES.costo.maximum),
    ]),
  });

  protected fields: DynamicFormField[] = [];

  ngOnChanges(cambios?: SimpleChanges): void {
    if (
      cambios &&
      this.fields.length > 0 &&
      !cambios['valorInicial'] &&
      !cambios['codigoBarrasAutomatico']
    )
      return;
    this.importes.reset({
      precio_venta:
        this.valorInicial?.precio_venta == null
          ? null
          : aCentavos(this.valorInicial.precio_venta) / 100,
      costo:
        this.valorInicial?.costo == null
          ? null
          : aCentavos(this.valorInicial.costo) / 100,
    });
    this.fields = [
      {
        name: 'talla',
        label: 'Talla',
        type: 'text',
        defaultValue: this.valorInicial?.talla ?? '',
        limite: LIMITES.talla,
      },
      {
        name: 'color',
        label: 'Color',
        type: 'text',
        defaultValue: this.valorInicial?.color ?? '',
        limite: LIMITES.color,
      },
      {
        name: 'codigo_barras',
        label: 'Código de barras',
        type: 'text',
        placeholder:
          this.codigoBarrasAutomatico && !this.valorInicial?.codigo_barras
            ? 'Se genera al guardar'
            : undefined,
        defaultValue: this.valorInicial?.codigo_barras ?? '',
        limite: LIMITES.codigo_barras,
        readonly: this.codigoBarrasAutomatico,
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    if (this.importes.invalid) return;
    this.guardar.emit({
      ...this.importes.getRawValue(),
      talla: value['talla'] as string | null,
      color: value['color'] as string | null,
      codigo_barras: value['codigo_barras'] as string | null,
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
    aplicarErroresServidor(this.importes, { error: { errors } });
  }
}
