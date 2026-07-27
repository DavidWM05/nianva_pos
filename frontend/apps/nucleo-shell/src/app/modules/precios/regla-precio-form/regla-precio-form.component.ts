import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField, EntidadBuscable, EntidadSelectorComponent } from '@nucleo/ui-shared';
import { Select } from 'primeng/select';

import { BUSCADOR_CATEGORIA, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../core/buscadores-entidad.tokens';
import { ReglaPrecioFormPayload } from '../regla-precio.service';
import { AplicaA, ReglaPrecio, TipoReglaPrecio } from '../regla-precio.types';

const OPCIONES_APLICA_A: { label: string; value: AplicaA }[] = [
  { label: 'Todo el catálogo', value: 'todo' },
  { label: 'Una categoría', value: 'categoria' },
  { label: 'Un producto', value: 'producto' },
  { label: 'Una variante específica', value: 'variante' },
];

/**
 * Primer formulario del proyecto con campos condicionales -- ver la
 * decision de diseno completa en el reporte. Resumen: los campos que
 * dependen de `tipo` (valor/cantidad_compra/cantidad_paga/precio_bundle)
 * se resuelven extendiendo DynamicFormComponent con `dependsOn` (ver
 * dynamic-form.types.ts, reutilizable por cualquier modulo futuro). La
 * seleccion de ENTIDAD (aplica_a + categoria/producto/variante) se
 * maneja fuera de DynamicFormComponent, con estado propio de este
 * componente: necesita un autocomplete server-side + un select en
 * cascada (EntidadSelectorComponent), no encaja en el modelo de "un tipo
 * de campo por fila" de DynamicFormComponent, y mezclar ambos hubiera
 * significado leer el FormGroup interno de un hijo desde afuera
 * (fragil) en vez de mantener su propio estado.
 *
 * EntidadSelectorComponent (ui-shared) es generico -- no sabe que es un
 * "producto" ni importa nada de Inventario. Este componente resuelve
 * los tokens BUSCADOR_PRODUCTO/BUSCADOR_VARIANTE_DE_PRODUCTO/
 * BUSCADOR_CATEGORIA (ver core/buscadores-entidad.tokens.ts, wireados a
 * las implementaciones de Inventario en app.config.ts) y se los pasa
 * por @Input -- asi Precios no importa ProductoService directamente.
 */
@Component({
  selector: 'nucleo-regla-precio-form',
  standalone: true,
  imports: [FormsModule, DynamicFormComponent, EntidadSelectorComponent, Select],
  templateUrl: './regla-precio-form.component.html',
  styleUrl: './regla-precio-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReglaPrecioFormComponent implements OnInit, OnChanges {
  protected readonly buscadorProducto = inject(BUSCADOR_PRODUCTO);
  protected readonly buscadorVarianteDeProducto = inject(BUSCADOR_VARIANTE_DE_PRODUCTO);
  private readonly buscadorCategoria = inject(BUSCADOR_CATEGORIA);

  @Input() valorInicial: ReglaPrecio | null = null;
  @Input() submitLabel = 'Guardar';
  /** Modo visualizar (ver el reporte del punto 1): mismo formulario, deshabilitado, sin boton de guardar. */
  @Input() readonly = false;

  @Output() guardar = new EventEmitter<ReglaPrecioFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];
  protected readonly opcionesAplicaA = OPCIONES_APLICA_A;

  protected readonly aplicaA = signal<AplicaA>('todo');
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly productoId = signal<number | null>(null);
  protected readonly varianteId = signal<number | null>(null);

  protected categorias: EntidadBuscable[] = [];

  ngOnInit(): void {
    this.buscadorCategoria.buscar('').subscribe((categorias) => (this.categorias = categorias));
  }

  ngOnChanges(): void {
    this.aplicaA.set(this.valorInicial?.aplica_a ?? 'todo');
    this.categoriaId.set(this.valorInicial?.categoria?.id ?? null);
    this.productoId.set(this.valorInicial?.producto?.id ?? null);
    this.varianteId.set(this.valorInicial?.variante?.id ?? null);

    this.fields = [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial?.nombre ?? '',
        maxLength: 120,
      },
      {
        name: 'tipo',
        label: 'Tipo',
        type: 'select',
        required: true,
        options: [
          { label: 'Porcentaje', value: 'porcentaje' },
          { label: 'Monto fijo', value: 'monto_fijo' },
          { label: 'NxM (ej. 3x2)', value: 'nxm' },
          { label: 'Bundle (precio fijo por paquete)', value: 'bundle' },
        ],
        defaultValue: this.valorInicial?.tipo ?? ('porcentaje' as TipoReglaPrecio),
      },
      {
        name: 'valor',
        label: 'Valor',
        type: 'number',
        required: true,
        dependsOn: { field: 'tipo', values: ['porcentaje', 'monto_fijo'] },
        defaultValue: this.valorInicial?.valor ?? null,
      },
      {
        name: 'cantidad_compra',
        label: 'Cantidad que compra',
        type: 'number',
        required: true,
        dependsOn: { field: 'tipo', values: ['nxm', 'bundle'] },
        defaultValue: this.valorInicial?.cantidad_compra ?? null,
      },
      {
        name: 'cantidad_paga',
        label: 'Cantidad que paga',
        type: 'number',
        required: true,
        dependsOn: { field: 'tipo', values: ['nxm'] },
        defaultValue: this.valorInicial?.cantidad_paga ?? null,
      },
      {
        name: 'precio_bundle',
        label: 'Precio del bundle',
        type: 'number',
        required: true,
        dependsOn: { field: 'tipo', values: ['bundle'] },
        defaultValue: this.valorInicial?.precio_bundle ?? null,
      },
      {
        name: 'fecha_inicio',
        label: 'Vigente desde',
        type: 'date',
        defaultValue: this.valorInicial?.fecha_inicio ? new Date(this.valorInicial.fecha_inicio) : null,
      },
      {
        name: 'fecha_fin',
        label: 'Vigente hasta',
        type: 'date',
        defaultValue: this.valorInicial?.fecha_fin ? new Date(this.valorInicial.fecha_fin) : null,
      },
    ];
  }

  onCambiarAplicaA(valor: AplicaA): void {
    this.aplicaA.set(valor);
    this.categoriaId.set(null);
    this.productoId.set(null);
    this.varianteId.set(null);
  }

  onSubmit(value: Record<string, unknown>): void {
    const fecha = (valor: unknown): string | null => {
      if (!valor) return null;
      return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor);
    };

    this.guardar.emit({
      ...(value as unknown as ReglaPrecioFormPayload),
      fecha_inicio: fecha(value['fecha_inicio']),
      fecha_fin: fecha(value['fecha_fin']),
      aplica_a: this.aplicaA(),
      categoria_id: this.categoriaId(),
      producto_id: this.productoId(),
      variante_id: this.varianteId(),
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
