import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, inject } from '@angular/core';
import { Validators } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';

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
  imports: [DynamicFormComponent],
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

  @Output() guardar = new EventEmitter<ProductoFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  private categorias: CatalogoSimple[] = [];
  private departamentos: CatalogoSimple[] = [];

  ngOnInit(): void {
    this.productoService.categorias().subscribe((categorias) => {
      this.categorias = categorias;
      this.construirCampos();
    });
    this.productoService.departamentos().subscribe((departamentos) => {
      this.departamentos = departamentos;
      this.construirCampos();
    });
  }

  ngOnChanges(): void {
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
        options: this.departamentos.map((d) => ({ label: d.nombre, value: d.id })),
        defaultValue: this.valorInicial?.departamento?.id ?? null,
      },
      {
        name: 'precio_compra',
        label: 'Precio de compra',
        type: 'number',
        validators: [Validators.min(0)],
        defaultValue: this.valorInicial?.precio_compra ?? null,
      },
      {
        name: 'precio_venta',
        label: 'Precio de venta',
        type: 'number',
        validators: [Validators.min(0)],
        defaultValue: this.valorInicial?.precio_venta ?? null,
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
    this.guardar.emit(value as unknown as ProductoFormPayload);
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
