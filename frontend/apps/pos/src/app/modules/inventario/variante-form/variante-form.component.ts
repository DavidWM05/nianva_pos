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
  FormRecord,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { limitesDe } from '@nianva/api-contrato';
import { type Atributo, ProductoVariante, VarianteFormPayload } from '@nianva/domain-inventario';
import {
  CampoComponent,
  InputDineroComponent,
  SelectFiltroComponent,
  SelectFiltroOpcion,
  aplicarErroresServidor,
} from '@nianva/ui-forms';
import { aCentavos } from '@nianva/ui-format';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';


/** Límites del cuerpo de la petición, leídos del contrato (UI-11b). */
const LIMITES = limitesDe('/productos/{producto}/variantes', 'post');

/**
 * Atributos/codigo_barras -- usado para crear una variante nueva
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
    SelectFiltroComponent,
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

  /**
   * ARQ-07: atributos del catálogo con sus valores (los carga la ruta del detalle). Uno por
   * selector; "Sin valor" deja la variante sin ese atributo.
   */
  @Input() atributos: Atributo[] = [];

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

  /** Un control por atributo, con la clave del id del atributo y el id del valor elegido. */
  protected readonly valoresElegidos = new FormRecord<FormControl<number | null>>({});

  protected fields: DynamicFormField[] = [];

  ngOnChanges(cambios?: SimpleChanges): void {
    if (!cambios || cambios['atributos'] || cambios['valorInicial']) {
      this.armarValores();
    }
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
      codigo_barras: value['codigo_barras'] as string | null,
      // Sin atributos en el catálogo no se manda `valores`: el backend conserva los de la variante.
      ...(this.atributos.length > 0 ? { valores: this.idsElegidos() } : {}),
    });
  }

  protected opcionesDe(atributo: Atributo): SelectFiltroOpcion[] {
    return [
      { label: 'Sin valor', value: null },
      ...(atributo.valores ?? []).map((valor) => ({ label: valor.nombre, value: valor.id })),
    ];
  }

  protected controlDe(atributo: Atributo): FormControl<number | null> {
    return this.valoresElegidos.controls[String(atributo.id)];
  }

  private armarValores(): void {
    const actuales = new Map(
      (this.valorInicial?.atributos ?? []).map((a) => [a.atributo_id, a.valor_id]),
    );
    for (const clave of Object.keys(this.valoresElegidos.controls)) {
      this.valoresElegidos.removeControl(clave);
    }
    for (const atributo of this.atributos) {
      this.valoresElegidos.addControl(
        String(atributo.id),
        new FormControl<number | null>(actuales.get(atributo.id) ?? null),
      );
    }
  }

  private idsElegidos(): number[] {
    return Object.values(this.valoresElegidos.getRawValue()).filter(
      (id): id is number => id !== null,
    );
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
    aplicarErroresServidor(this.importes, { error: { errors } });
  }
}
