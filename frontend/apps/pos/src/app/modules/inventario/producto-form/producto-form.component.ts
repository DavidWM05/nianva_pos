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

import { ProductoFormPayload, ProductoService } from '../producto.service';
import { CatalogoSimple, Producto } from '../producto.types';

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
  styleUrl: './producto-form.component.scss',
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
    precio_compra: new FormControl<number | null>(null, [Validators.min(0)]),
    precio_venta: new FormControl<number | null>(null, [Validators.min(0)]),
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
        ? Number(this.valorInicial.precio_compra)
        : null,
      precio_venta: this.valorInicial
        ? Number(this.valorInicial.precio_venta)
        : null,
    });
    this.construirCampos();
  }

  private construirCampos(): void {
    this.fields = [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial?.nombre ?? '',
        maxLength: 200,
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
      nombre: value['nombre'] as string,
      ...this.numericos.getRawValue(),
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
    aplicarErroresServidor(this.numericos, { error: { errors } });
  }
}
