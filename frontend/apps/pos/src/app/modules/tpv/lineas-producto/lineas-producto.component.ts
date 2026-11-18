import { SelectorPresentacionComponent } from '../selector-presentacion/selector-presentacion.component';
import { PresentacionBuscable } from '../../../core/buscadores-entidad.tokens';
import { maximoEnPresentaciones } from '@nianva/ui-format';
import { ToastService, mensajeError } from '@nianva/ui-shared';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EntidadBuscable, EntidadSelectorComponent } from '@nianva/ui-shared';
import { MatButton, MatIconButton } from '@angular/material/button';
import { CampoComponent } from '@nianva/ui-forms';
import { aCentavos, CantidadPipe, DineroPipe } from '@nianva/ui-format';

import {
  BUSCADOR_PRODUCTO,
  BUSCADOR_VARIANTE_DE_PRODUCTO,
} from '../../../core/buscadores-entidad.tokens';
import { VentaItemPayload, VentaService } from '@nianva/domain-tpv';

interface LineaCarrito {
  presentacion_id?: number;
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
  precio_unitario?: string | number;
  descuento_aplicado?: string | number;
  subtotal?: string | number;
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
  imports: [
    FormsModule,
    SelectorPresentacionComponent,
    EntidadSelectorComponent,
    MatButton,
    MatIconButton,
    CampoComponent,
    CantidadPipe,
    DineroPipe,
  ],
  templateUrl: './lineas-producto.component.html',
  styleUrl: './lineas-producto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineasProductoComponent implements OnChanges {
  @Input() presentacionesHabilitadas = false;
  protected readonly presentacionSeleccionada = signal<PresentacionBuscable | null>(null);
  private readonly toast = inject(ToastService);
  @Input() clienteId: number | null = null;
  @Input() listaPrecioId: number | null = null;
  private versionCotizacion = 0;
  ngOnChanges(): void {
    if (this.lineas().length > 0) this.recotizar();
  }
  private readonly ventaService = inject(VentaService);

  protected readonly buscadorProducto = inject(BUSCADOR_PRODUCTO);
  protected readonly buscadorVarianteDeProducto = inject(
    BUSCADOR_VARIANTE_DE_PRODUCTO,
  );

  @ViewChild(EntidadSelectorComponent)
  private selectorProductoRef!: EntidadSelectorComponent;

  @Output() cambio = new EventEmitter<LineasProductoCambio>();

  protected readonly productoSeleccionadoId = signal<number | null>(null);
  protected readonly productoSeleccionadoNombre = signal<string | null>(null);
  protected readonly varianteSeleccionadaId = signal<number | null>(null);
  protected readonly variantesDelProductoSeleccionado = signal<
    EntidadBuscable[]
  >([]);
  protected readonly cantidadNueva = signal(1);

  protected readonly lineas = signal<LineaCarrito[]>([]);
  protected readonly cotizando = signal(false);
  protected readonly subtotal = signal(0);

  /** null = variante sin seleccionar o el backend no reporto stock_actual (no bloquea). */
  protected readonly stockVarianteSeleccionada = computed<number | null>(() => {
    const id = this.varianteSeleccionadaId();
    if (id === null) return null;

    const base = this.variantesDelProductoSeleccionado().find((v) => v.id === id)?.stock_actual;
    return base === undefined ? null : maximoEnPresentaciones(base, this.presentacionSeleccionada()?.factor ?? '1.000');
  });

  protected readonly cantidadExcedeStock = computed(() => {
    const stock = this.stockVarianteSeleccionada();

    return stock !== null && this.cantidadNueva() > stock;
  });

  onProductoSeleccionado(id: number | null): void {
    this.productoSeleccionadoId.set(id);
    this.varianteSeleccionadaId.set(null);
    this.presentacionSeleccionada.set(null);
    this.variantesDelProductoSeleccionado.set([]);
    this.productoSeleccionadoNombre.set(null);

    if (id === null) return;

    this.buscadorProducto
      .obtener(id)
      .subscribe((producto) =>
        this.productoSeleccionadoNombre.set(producto.nombre),
      );
    this.buscadorVarianteDeProducto
      .hijosDe(id)
      .subscribe((variantes) =>
        this.variantesDelProductoSeleccionado.set(variantes),
      );
  }

  onVarianteSeleccionada(id: number | null): void {
    this.varianteSeleccionadaId.set(id);
    this.presentacionSeleccionada.set(null);
  }

  agregarLinea(): void {
    const varianteId = this.varianteSeleccionadaId();
    const cantidad = this.cantidadNueva();
    if (varianteId === null || cantidad <= 0 || this.cantidadExcedeStock())
      return;

    const varianteElegida = this.variantesDelProductoSeleccionado().find(
      (v) => v.id === varianteId,
    );
    const presentacion = this.presentacionSeleccionada();
    const etiqueta = `${this.productoSeleccionadoNombre() ?? ''} (${varianteElegida?.nombre ?? ''})${presentacion ? ' — ' + presentacion.nombre : ''}`;

    this.lineas.update((actuales) => [
      ...actuales,
      {
        variante_id: varianteId,
        ...(presentacion ? { presentacion_id: presentacion.id } : {}),
        cantidad,
        etiqueta,
        stockDisponible: this.stockVarianteSeleccionada() ?? undefined,
      },
    ]);

    this.onProductoSeleccionado(null);
    this.cantidadNueva.set(1);
    this.recotizar();
  }

  /** Foco en el buscador de producto -- delega el atajo F2 del POS (ver VentaComponent). */
  focusBuscador(): void {
    this.selectorProductoRef.focus();
  }

  /**
   * Descarta la seleccion producto/variante/cantidad en curso (todavia no
   * agregada al carrito con "Agregar línea") -- delega el atajo ESC del
   * POS. No toca lineas ya agregadas: cancelar la captura en curso es el
   * gesto esperado ("me equivoqué al escanear, vuelvo a intentar"), borrar
   * una linea ya confirmada es una accion mas destructiva que merece su
   * propio boton explicito (quitarLinea), no una tecla global.
   */
  cancelarLineaEnCurso(): void {
    this.onProductoSeleccionado(null);
    this.cantidadNueva.set(1);
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

        const cantidadValida =
          linea.stockDisponible !== undefined
            ? Math.min(cantidad, linea.stockDisponible)
            : cantidad;

        return { ...linea, cantidad: cantidadValida };
      }),
    );
    this.recotizar();
  }

  /** Limpia el carrito -- lo llama el padre (via ViewChild) tras registrar con exito. */
  reiniciar(): void {
    this.versionCotizacion++;
    this.cotizando.set(false);
    this.lineas.set([]);
    this.subtotal.set(0);
    this.emitirCambio();
  }

  private recotizar(): void {
    const version = ++this.versionCotizacion;
    const items = this.itemsActuales();

    if (items.length === 0) {
      this.subtotal.set(0);
      this.emitirCambio();

      return;
    }

    this.cotizando.set(true);
    const peticion =
      this.clienteId === null && this.listaPrecioId === null
        ? this.ventaService.cotizar(items)
        : this.ventaService.cotizar(items, {
            cliente_id: this.clienteId,
            lista_precio_id: this.listaPrecioId,
          });
    peticion.subscribe({
      next: (cotizacion) => {
        if (version !== this.versionCotizacion) return;
        this.lineas.update((actuales) =>
          actuales.map((linea, i) => ({
            ...linea,
            precio_unitario: cotizacion.items[i]?.precio_unitario,
            descuento_aplicado: cotizacion.items[i]?.descuento_aplicado,
            subtotal: cotizacion.items[i]?.subtotal,
          })),
        );
        this.subtotal.set(aCentavos(cotizacion.subtotal) / 100);
        this.cotizando.set(false);
        this.emitirCambio();
      },
      error: () => {
        if (version === this.versionCotizacion) this.cotizando.set(false);
      },
    });
  }

  escanearCodigo(codigo: string): void {
    if (!this.presentacionesHabilitadas || !codigo.trim()) return;
    this.ventaService.resolverCodigo(codigo.trim()).subscribe({next: dato => {
      const disponible = maximoEnPresentaciones(dato.stock_actual, dato.factor);
      if (disponible < 1) { this.toast.warn('No hay stock suficiente para esta presentación.'); return; }
      this.lineas.update(lineas=>[...lineas,{variante_id:dato.variante_id,...(dato.presentacion_id === null ? {} : {presentacion_id:dato.presentacion_id}),cantidad:1,etiqueta:dato.producto_nombre+(dato.presentacion_nombre?' — '+dato.presentacion_nombre:''),stockDisponible:disponible}]);
      this.recotizar();
    },error: error=>this.toast.error(mensajeError(error,'No se encontró el código de barras.'))});
  }

  private itemsActuales(): VentaItemPayload[] {
    return this.lineas().map((linea) => ({
      variante_id: linea.variante_id,
      ...(linea.presentacion_id === undefined ? {} : { presentacion_id: linea.presentacion_id }),
      cantidad: linea.cantidad,
    }));
  }

  private emitirCambio(): void {
    this.cambio.emit({
      items: this.itemsActuales(),
      subtotal: this.subtotal(),
    });
  }
}
