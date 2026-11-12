import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { CampoComponent, InputCantidadComponent, InputDineroComponent } from '@nianva/ui-forms';
import { DineroPipe } from '@nianva/ui-format';
import { EmptyComponent } from '@nianva/ui-data';
import { FormActionsComponent, PantallaService, SectionComponent } from '@nianva/ui-layout';
import { conUmbral } from '@nianva/ui-feedback';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { EntidadBuscable, EntidadSelectorComponent } from '@nianva/ui-shared';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../core/buscadores-entidad.tokens';
import { CotizacionDetalle, CotizacionItemPayload } from '../cotizacion.types';
import { VentaService } from '../../tpv/venta.service';

interface LineaCotizacion {
  variante_id: number;
  etiqueta: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
}

export interface LineasCotizacionCambio {
  items: CotizacionItemPayload[];
  subtotal: number;
}

function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}

/**
 * Carrito editable de Cotizaciones -- a diferencia de
 * LineasProductoComponent (TPV/Apartados), el precio y el descuento por
 * linea SON editables: CotizacionService (backend) nunca resuelve
 * precio_unitario via PrecioService (el docblock lo dice explicito: "store()/
 * actualizar() nunca calculan precios -- se reciben del frontend"). Se usa
 * VentaService.cotizar() solo para PRE-LLENAR el precio sugerido al agregar
 * una linea (mismo motor de reglas de precio que usa el POS), pero el
 * usuario puede sobreescribirlo despues -- una cotizacion suele llevar un
 * precio negociado, no el de catalogo.
 *
 * Por eso no se reutiliza LineasProductoComponent tal cual (como si hacen
 * Apartados/Devoluciones): ese componente fuerza el precio resuelto por el
 * backend y no expone inputs editables de precio/descuento por linea.
 */
@Component({
  selector: 'nucleo-lineas-cotizacion',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, EntidadSelectorComponent, MatButton, CampoComponent, InputCantidadComponent, InputDineroComponent, DineroPipe, EmptyComponent, FormActionsComponent, SectionComponent, MatProgressSpinner],
  templateUrl: './lineas-cotizacion.component.html',
  styleUrl: './lineas-cotizacion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineasCotizacionComponent implements OnChanges {
  private readonly ventaService = inject(VentaService);
  protected readonly pantalla = inject(PantallaService);
  readonly formularioLineas = new FormGroup({ items: new FormArray<FormGroup<{
    cantidad: FormControl<number>; precio_unitario: FormControl<number>; descuento: FormControl<number>;
  }>>([]) });
  protected readonly gruposLineas = this.formularioLineas.controls.items;


  protected readonly buscadorProducto = inject(BUSCADOR_PRODUCTO);
  protected readonly buscadorVarianteDeProducto = inject(BUSCADOR_VARIANTE_DE_PRODUCTO);

  /** Lineas iniciales al editar una cotizacion existente (forma cruda del backend) -- vacio/null al crear. */
  @Input() valorInicial: CotizacionDetalle[] | null = null;

  /**
   * true solo con cotizaciones.precio_manual. Por defecto true para no
   * romper usos previos; el formulario siempre passa el permiso real.
   */
  @Input() precioManual = true;

  @Output() cambio = new EventEmitter<LineasCotizacionCambio>();

  protected readonly productoSeleccionadoId = signal<number | null>(null);
  protected readonly productoSeleccionadoNombre = signal<string | null>(null);
  protected readonly varianteSeleccionadaId = signal<number | null>(null);
  protected readonly variantesDelProductoSeleccionado = signal<EntidadBuscable[]>([]);
  protected readonly cantidadNueva = signal(1);
  protected readonly sugiriendoPrecio = signal(false);
  protected readonly indicadorPrecio = conUmbral(this.sugiriendoPrecio);

  protected readonly lineas = signal<LineaCotizacion[]>([]);

  protected readonly subtotal = computed(() =>
    redondear(this.lineas().reduce((acumulado, l) => acumulado + l.cantidad * l.precio_unitario - l.descuento, 0)),
  );

  ngOnChanges(): void {
    if (this.valorInicial && this.lineas().length === 0) {
      this.lineas.set(
        this.valorInicial.map((detalle) => ({
          variante_id: detalle.variante_id,
          etiqueta: detalle.variante?.nombre ?? `Variante #${detalle.variante_id}`,
          cantidad: detalle.cantidad,
          precio_unitario: Number(detalle.precio_unitario),
          descuento: Number(detalle.descuento),
        })),
      );
      this.emitirCambio();
    }
    for (const grupo of this.gruposLineas.controls) {
      for (const campo of ['precio_unitario', 'descuento'] as const) {
        if (this.precioManual) grupo.controls[campo].enable({ emitEvent: false });
        else grupo.controls[campo].disable({ emitEvent: false });
      }
    }
  }

  onProductoSeleccionado(id: number | null): void {
    this.productoSeleccionadoId.set(id);
    this.varianteSeleccionadaId.set(null);
    this.variantesDelProductoSeleccionado.set([]);
    this.productoSeleccionadoNombre.set(null);

    if (id === null) return;

    this.buscadorProducto.obtener(id).subscribe((producto) => this.productoSeleccionadoNombre.set(producto.nombre));
    this.buscadorVarianteDeProducto
      .hijosDe(id)
      .subscribe((variantes) => this.variantesDelProductoSeleccionado.set(variantes));
  }

  onVarianteSeleccionada(id: number | null): void {
    this.varianteSeleccionadaId.set(id);
  }

  agregarLinea(): void {
    const varianteId = this.varianteSeleccionadaId();
    const cantidad = this.cantidadNueva();
    if (varianteId === null || cantidad <= 0) return;

    const varianteElegida = this.variantesDelProductoSeleccionado().find((v) => v.id === varianteId);
    const etiqueta = `${this.productoSeleccionadoNombre() ?? ''} (${varianteElegida?.nombre ?? ''})`;

    this.sugiriendoPrecio.set(true);
    this.ventaService.cotizar([{ variante_id: varianteId, cantidad }]).subscribe({
      next: (cotizacion) => {
        const sugerido = cotizacion.items[0];
        this.lineas.update((actuales) => [
          ...actuales,
          {
            variante_id: varianteId,
            etiqueta,
            cantidad,
            precio_unitario: sugerido?.precio_unitario ?? 0,
            descuento: sugerido?.descuento_aplicado ?? 0,
          },
        ]);
        this.sugiriendoPrecio.set(false);
        this.onProductoSeleccionado(null);
        this.cantidadNueva.set(1);
        this.emitirCambio();
      },
      error: () => {
        // Sin sugerencia de precio (ej. variante sin reglas) -- se agrega
        // igual en 0, el usuario captura el precio a mano. Nunca bloquea
        // la linea: a diferencia del POS, aqui el precio siempre es
        // editable, la sugerencia es solo un punto de partida.
        this.lineas.update((actuales) => [
          ...actuales,
          { variante_id: varianteId, etiqueta, cantidad, precio_unitario: 0, descuento: 0 },
        ]);
        this.sugiriendoPrecio.set(false);
        this.onProductoSeleccionado(null);
        this.cantidadNueva.set(1);
        this.emitirCambio();
      },
    });
  }

  quitarLinea(indice: number): void {
    this.gruposLineas.removeAt(indice, { emitEvent: false });
    this.lineas.update((actuales) => actuales.filter((_, i) => i !== indice));
    this.emitirCambio();
  }

  actualizarCantidad(indice: number, cantidad: number): void {
    if (cantidad <= 0) return;
    this.lineas.update((actuales) => actuales.map((l, i) => (i === indice ? { ...l, cantidad } : l)));
    this.gruposLineas.at(indice)?.controls.cantidad.setValue(cantidad, { emitEvent: false });
    this.emitirCambio();
  }

  actualizarPrecio(indice: number, precio: number): void {
    if (!this.precioManual || precio < 0) return;
    this.lineas.update((actuales) => actuales.map((l, i) => (i === indice ? { ...l, precio_unitario: precio } : l)));
    this.gruposLineas.at(indice)?.controls.precio_unitario.setValue(precio, { emitEvent: false });
    this.emitirCambio();
  }

  actualizarDescuento(indice: number, descuento: number): void {
    if (!this.precioManual || descuento < 0) return;
    this.lineas.update((actuales) => actuales.map((l, i) => (i === indice ? { ...l, descuento } : l)));
    this.gruposLineas.at(indice)?.controls.descuento.setValue(descuento, { emitEvent: false });
    this.emitirCambio();
  }

  private emitirCambio(): void {
    while (this.gruposLineas.length < this.lineas().length) {
      const linea = this.lineas()[this.gruposLineas.length];
      const grupo = new FormGroup({
        cantidad: new FormControl(linea.cantidad, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
        precio_unitario: new FormControl({ value: linea.precio_unitario, disabled: !this.precioManual }, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
        descuento: new FormControl({ value: linea.descuento, disabled: !this.precioManual }, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      });
      this.gruposLineas.push(grupo, { emitEvent: false });
      grupo.controls.cantidad.valueChanges.subscribe(valor => {
        if (grupo.controls.cantidad.valid) this.actualizarCantidad(this.gruposLineas.controls.indexOf(grupo), valor);
      });
      grupo.controls.precio_unitario.valueChanges.subscribe(valor => {
        if (grupo.controls.precio_unitario.valid) this.actualizarPrecio(this.gruposLineas.controls.indexOf(grupo), valor);
      });
      grupo.controls.descuento.valueChanges.subscribe(valor => {
        if (grupo.controls.descuento.valid) this.actualizarDescuento(this.gruposLineas.controls.indexOf(grupo), valor);
      });
    }
    this.cambio.emit({
      items: this.gruposLineas.getRawValue().map((l, indice) => ({
        variante_id: this.lineas()[indice].variante_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        descuento: l.descuento,
      })),
      subtotal: this.subtotal(),
    });
  }
}
