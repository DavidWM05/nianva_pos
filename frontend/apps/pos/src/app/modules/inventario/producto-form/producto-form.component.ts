import { limitesDe } from '@nianva/api-contrato';
import { aCentavos, tasaANumero } from '@nianva/ui-format';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CampoComponent,
  InputDineroComponent,
  aplicarErroresServidor,
} from '@nianva/ui-forms';
import { PageComponent } from '@nianva/ui-layout';
import { forkJoin } from 'rxjs';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { CatalogoSimple, Producto, ProductoFormPayload, ProductoService } from '@nianva/domain-inventario';

/** Límites del cuerpo de la petición, leídos del contrato (UI-11b). */
const LIMITES = limitesDe('/productos', 'post');

/**
 * Reutilizado por la vista de creacion (sin valorInicial, ver
 * ProductoCrearComponent) y por la pestana General de la vista de registro
 * (con valorInicial, y con `readonly` cuando falta el permiso de editar) --
 * mismo patron que ClienteFormComponent en Crm.
 *
 * categoria_id/departamento_id son selects poblados desde
 * ProductoService.categorias()/departamentos() (los catalogos de apoyo
 * simples) -- se piden una vez en ngOnInit, no en cada rebuild de fields.
 */
@Component({
  selector: 'nucleo-producto-form',
  standalone: true,
  imports: [
    DynamicFormComponent,
    PageComponent,
    ReactiveFormsModule,
    CampoComponent,
    InputDineroComponent,
  ],
  templateUrl: './producto-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoFormComponent implements OnInit, OnChanges {
  private readonly productoService = inject(ProductoService);

  @Input() valorInicial: Producto | null = null;
  @Input() submitLabel = 'Guardar';
  /** Modo visualizar (ver el reporte del punto 1): mismo formulario, deshabilitado, sin boton de guardar. */
  @Input() readonly = false;

  @Input() enviando = false;

  @Output() guardar = new EventEmitter<ProductoFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected readonly numericos = new FormGroup({
    precio_compra: new FormControl<number | null>(null, [Validators.min(LIMITES.precio_compra.minimum)]),
    precio_venta: new FormControl<number | null>(null, [Validators.min(LIMITES.precio_venta.minimum)]),
  });

  protected readonly estadoCatalogos = signal<'cargando' | 'listo' | 'error'>(
    'cargando',
  );

  protected fields: DynamicFormField[] = [];

  private categorias: CatalogoSimple[] = [];
  private departamentos: CatalogoSimple[] = [];

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  protected cargarCatalogos(): void {
    this.estadoCatalogos.set('cargando');
    forkJoin({
      categorias: this.productoService.categorias(),
      departamentos: this.productoService.departamentos(),
    }).subscribe({
      next: ({ categorias, departamentos }) => {
        this.categorias = categorias;
        this.departamentos = departamentos;
        this.construirCampos();
        this.estadoCatalogos.set('listo');
      },
      error: () => this.estadoCatalogos.set('error'),
    });
  }

  ngOnChanges(cambios?: SimpleChanges): void {
    if (!cambios || cambios['readonly']) {
      if (this.readonly) this.numericos.disable({ emitEvent: false });
      else this.numericos.enable({ emitEvent: false });
    }
    if (cambios && this.fields.length > 0 && !cambios['valorInicial']) return;
    this.numericos.reset({
      precio_compra: this.valorInicial
        ? aCentavos(this.valorInicial.precio_compra) / 100
        : null,
      precio_venta: this.valorInicial
        ? aCentavos(this.valorInicial.precio_venta) / 100
        : null,
    });
    this.construirCampos();
  }

  private construirCampos(): void {
    this.fields = [
      {
        name: 'tasa_iva',
        label: 'Tasa de IVA',
        type: 'select',
        options: [
          { label: 'Usar la del tenant', value: null },
          { label: '16 %', value: '16.0000' },
          { label: '8 %', value: '8.0000' },
          { label: '0 %', value: '0.0000' },
        ],
        defaultValue: this.valorInicial?.tasa_iva ?? null,
      },
      {
        name: 'exento_iva',
        label: 'Exento de IVA',
        type: 'checkbox',
        defaultValue: this.valorInicial?.exento_iva ?? false,
      },
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        defaultValue: this.valorInicial?.nombre ?? '',
        limite: LIMITES.nombre,
      },
      {
        name: 'categoria_id',
        label: 'Categoría',
        type: 'select',
        options: this.categorias.map((c) => ({ label: c.nombre, value: c.id })),
        defaultValue: this.valorInicial?.categoria?.id ?? null,
      },
      {
        name: 'departamento_id',
        label: 'Departamento',
        type: 'select',
        options: this.departamentos.map((d) => ({
          label: d.nombre,
          value: d.id,
        })),
        defaultValue: this.valorInicial?.departamento?.id ?? null,
      },
      {
        name: 'no_resurtible',
        label: 'No resurtible',
        type: 'checkbox',
        defaultValue: this.valorInicial?.no_resurtible ?? false,
      },
      {
        name: 'sin_descuento',
        label: 'Sin descuento',
        type: 'checkbox',
        defaultValue: this.valorInicial?.sin_descuento ?? false,
      },
      {
        name: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        defaultValue: this.valorInicial?.descripcion ?? '',
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit({
      ...value,
      ...(value['tasa_iva'] === undefined
        ? {}
        : {
            tasa_iva:
              value['tasa_iva'] === null
                ? null
                : tasaANumero(String(value['tasa_iva'])),
          }),
      nombre: value['nombre'] as string,
      ...this.numericos.getRawValue(),
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
    aplicarErroresServidor(this.numericos, { error: { errors } });
  }
}
