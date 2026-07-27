import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EntidadBuscable, EntidadSelectorComponent } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../core/buscadores-entidad.tokens';
import { VentaItemPayload } from '../venta.types';
import { VentaService } from '../venta.service';

interface LineaCarrito {
  variante_id: number;
  cantidad: number;
  etiqueta: string;
  /**
   * Snapshot del stock disponible al momento de agregar la linea (ver
   * agregarLinea()) -- mismo criterio que "cantidadMaxima" en
   * DevolucionFormComponent: se congela en ese instante, no se revalida
   * contra el servidor en cada tecleo. undefined si el backend no lo
   * reporto (no deberia pasar hoy, pero el campo es opcional en
   * EntidadBuscable) -- en ese caso no se clamea, es UX optimista, el
   * backend sigue siendo la fuente de verdad real al someter.
   */
  stockDisponible?: number;
  /** Se llenan tras cotizar() -- undefined mientras la cotizacion esta en curso. */
  precio_unitario?: number;
  descuento_aplicado?: number;
  subtotal?: number;
}

export interface LineasProductoCambio {
  items: VentaItemPayload[];
  subtotal: number;
}

/**
 * Carrito de lineas producto/variante + cotizacion, extraido de
 * VentaComponent (TPV) para reutilizarlo tal cual en la creacion de un
 * apartado (mismo flujo: buscar producto -> variante -> cantidad ->
 * agregar, precio siempre resuelto por VentaService.cotizar(), nunca
 * calculado aqui). Vive en el modulo Tpv (no en ui-shared) porque conoce
 * conceptos de dominio especificos (cotizar, EntidadSelectorComponent en
 * modo cascada producto/variante) -- Apartados puede importarlo porque
 * ya depende de Tpv en el backend (ApartadoService inyecta VentaService),
 * misma direccion de dependencia permitida en el frontend.
 *
 * No incluye cupon ni pago -- eso es especifico de la venta de TPV (ver
 * VentaComponent) y no aplica a la creacion de un apartado.
 */
@Component({
  selector: 'nucleo-lineas-producto',
  standalone: true,
  imports: [FormsModule, EntidadSelectorComponent, Button, InputText],
  templateUrl: './lineas-producto.component.html',
  styleUrl: './lineas-producto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineasProductoComponent {
  private readonly ventaService = inject(VentaService);

  protected readonly buscadorProducto = inject(BUSCADOR_PRODUCTO);
  protected readonly buscadorVarianteDeProducto = inject(BUSCADOR_VARIANTE_DE_PRODUCTO);

  @Output() cambio = new EventEmitter<LineasProductoCambio>();

  protected readonly productoSeleccionadoId = signal<number | null>(null);
  protected readonly productoSeleccionadoNombre = signal<string | null>(null);
  protected readonly varianteSeleccionadaId = signal<number | null>(null);
  protected readonly variantesDelProductoSeleccionado = signal<EntidadBuscable[]>([]);
  protected readonly cantidadNueva = signal(1);

  protected readonly lineas = signal<LineaCarrito[]>([]);
  protected readonly cotizando = signal(false);
  protected readonly subtotal = signal(0);

  /** null = variante sin seleccionar o el backend no reporto stock_actual (no bloquea). */
  protected readonly stockVarianteSeleccionada = computed<number | null>(() => {
    const id = this.varianteSeleccionadaId();
    if (id === null) return null;

    return this.variantesDelProductoSeleccionado().find((v) => v.id === id)?.stock_actual ?? null;
  });

  protected readonly cantidadExcedeStock = computed(() => {
    const stock = this.stockVarianteSeleccionada();

    return stock !== null && this.cantidadNueva() > stock;
  });

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
    if (varianteId === null || cantidad <= 0 || this.cantidadExcedeStock()) return;

    const varianteElegida = this.variantesDelProductoSeleccionado().find((v) => v.id === varianteId);
    const etiqueta = `${this.productoSeleccionadoNombre() ?? ''} (${varianteElegida?.nombre ?? ''})`;

    this.lineas.update((actuales) => [
      ...actuales,
      { variante_id: varianteId, cantidad, etiqueta, stockDisponible: varianteElegida?.stock_actual },
    ]);

    this.onProductoSeleccionado(null);
    this.cantidadNueva.set(1);
    this.recotizar();
  }

  quitarLinea(indice: number): void {
    this.lineas.update((actuales) => actuales.filter((_, i) => i !== indice));
    this.recotizar();
  }

  cambiarCantidad(indice: number, cantidad: number): void {
    if (cantidad <= 0) return;

    this.lineas.update((actuales) =>
      actuales.map((linea, i) => {
        if (i !== indice) return linea;

        const cantidadValida = linea.stockDisponible !== undefined ? Math.min(cantidad, linea.stockDisponible) : cantidad;

        return { ...linea, cantidad: cantidadValida };
      }),
    );
    this.recotizar();
  }

  /** Limpia el carrito -- lo llama el padre (via ViewChild) tras registrar con exito. */
  reiniciar(): void {
    this.lineas.set([]);
    this.subtotal.set(0);
    this.emitirCambio();
  }

  private recotizar(): void {
    const items = this.itemsActuales();

    if (items.length === 0) {
      this.subtotal.set(0);
      this.emitirCambio();

      return;
    }

    this.cotizando.set(true);
    this.ventaService.cotizar(items).subscribe({
      next: (cotizacion) => {
        this.lineas.update((actuales) =>
          actuales.map((linea, i) => ({
            ...linea,
            precio_unitario: cotizacion.items[i]?.precio_unitario,
            descuento_aplicado: cotizacion.items[i]?.descuento_aplicado,
            subtotal: cotizacion.items[i]?.subtotal,
          })),
        );
        this.subtotal.set(cotizacion.subtotal);
        this.cotizando.set(false);
        this.emitirCambio();
      },
      error: () => this.cotizando.set(false),
    });
  }

  private itemsActuales(): VentaItemPayload[] {
    return this.lineas().map((linea) => ({ variante_id: linea.variante_id, cantidad: linea.cantidad }));
  }

  private emitirCambio(): void {
    this.cambio.emit({ items: this.itemsActuales(), subtotal: this.subtotal() });
  }
}
