import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { LineasPagoCambio, LineasPagoComponent } from '../../../tpv/lineas-pago/lineas-pago.component';
import { LineasProductoCambio, LineasProductoComponent } from '../../../tpv/lineas-producto/lineas-producto.component';
import { ErrorNegocioTpv } from '../../../tpv/tpv-error.types';
import { Venta, VentaItemPayload, VentaPagoPayload } from '../../../tpv/venta.types';
import { VentaService } from '../../../tpv/venta.service';
import { DevolucionService } from '../../devolucion.service';
import { DevolucionFormPayload, TipoDevolucion } from '../../devolucion.types';

interface LineaDevuelta {
  variante_id: number;
  etiqueta: string;
  cantidadMaxima: number;
  cantidad: number;
  vaAMerma: boolean;
  precioUnitario: number;
}

function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}

function centavos(monto: number): number {
  return Math.round(monto * 100);
}

/**
 * Creacion de devolucion/cambio. Dos formas de entrar (ver el reporte,
 * punto 1): buscando la venta origen por id a mano, o navegando aqui con
 * `?venta_id=` desde el boton "Devolver" en el detalle de una venta
 * (ver VentasListComponent en TPV) -- ambas terminan en el mismo estado,
 * asi que se resuelven con el mismo codigo (ngOnInit solo pre-llena el
 * campo de busqueda si el query param esta presente).
 *
 * Reutiliza LineasProductoComponent (items nuevos de un cambio) y
 * LineasPagoComponent (pago de la diferencia) de TPV tal cual -- mismos
 * componentes que ya usan Venta/Apartados, sin adaptar nada.
 */
@Component({
  selector: 'nucleo-devolucion-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LineasProductoComponent, LineasPagoComponent, Button, Checkbox, InputText, Textarea],
  templateUrl: './devolucion-form.component.html',
  styleUrl: './devolucion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevolucionFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ventaService = inject(VentaService);
  private readonly devolucionService = inject(DevolucionService);
  private readonly toast = inject(ToastService);

  protected readonly ventaIdBusqueda = signal<number | null>(null);
  protected readonly ventaOrigen = signal<Venta | null>(null);
  protected readonly cargandoVenta = signal(false);

  protected readonly tipo = signal<TipoDevolucion>('devolucion');
  protected readonly lineasDevueltas = signal<LineaDevuelta[]>([]);

  protected readonly itemsNuevosActuales = signal<VentaItemPayload[]>([]);
  protected readonly montoCambio = signal(0);

  protected readonly motivo = signal('');

  protected readonly pagosActuales = signal<VentaPagoPayload[]>([]);
  protected readonly pagoCuadra = signal(false);

  protected readonly registrando = signal(false);

  protected readonly montoDevolucionEstimado = computed(() =>
    redondear(
      this.lineasDevueltas()
        .filter((l) => l.cantidad > 0)
        .reduce((acumulado, l) => acumulado + l.cantidad * l.precioUnitario, 0),
    ),
  );

  /** Estimacion solo para feedback en vivo -- la diferencia real la calcula el backend al registrar. */
  protected readonly diferenciaEstimada = computed(() =>
    redondear((this.tipo() === 'cambio' ? this.montoCambio() : 0) - this.montoDevolucionEstimado()),
  );

  /** Una linea va_a_merma=true NUNCA cuenta aqui -- ver DevolucionService, que ni siquiera la toca en InventarioService. */
  protected readonly unidadesRegresanAStock = computed(() =>
    this.lineasDevueltas()
      .filter((l) => l.cantidad > 0 && !l.vaAMerma)
      .reduce((acumulado, l) => acumulado + l.cantidad, 0),
  );

  protected readonly unidadesMerma = computed(() =>
    this.lineasDevueltas()
      .filter((l) => l.cantidad > 0 && l.vaAMerma)
      .reduce((acumulado, l) => acumulado + l.cantidad, 0),
  );

  protected readonly pagoNecesario = computed(() => centavos(this.diferenciaEstimada()) !== 0);
  protected readonly montoAPagar = computed(() => Math.abs(this.diferenciaEstimada()));

  protected readonly ventaEsSombra = computed(() => this.ventaOrigen()?.es_venta_sombra === true);
  protected readonly rechazoPorVentaSombra = computed(() => this.ventaEsSombra() && this.tipo() === 'devolucion');

  ngOnInit(): void {
    const ventaIdParam = this.route.snapshot.queryParamMap.get('venta_id');
    if (ventaIdParam) {
      this.ventaIdBusqueda.set(Number(ventaIdParam));
      this.buscarVenta();
    }
  }

  buscarVenta(): void {
    const id = this.ventaIdBusqueda();
    if (id === null) return;

    this.cargandoVenta.set(true);
    this.ventaOrigen.set(null);
    this.reiniciarLineas();

    this.ventaService.obtener(id).subscribe({
      next: (venta) => {
        this.ventaOrigen.set(venta);
        this.lineasDevueltas.set(
          (venta.detalles ?? []).map((detalle) => ({
            variante_id: detalle.variante_id,
            etiqueta: `${detalle.variante?.producto_nombre ?? ''} (${[detalle.variante?.talla, detalle.variante?.color].filter((v) => !!v).join(' / ')})`,
            cantidadMaxima: detalle.cantidad,
            cantidad: 0,
            vaAMerma: false,
            precioUnitario: Number(detalle.precio_unitario),
          })),
        );
        this.cargandoVenta.set(false);
      },
      error: () => {
        this.cargandoVenta.set(false);
        this.toast.error('No se encontró la venta o no tienes permiso para verla.');
      },
    });
  }

  cambiarVenta(): void {
    this.ventaOrigen.set(null);
    this.ventaIdBusqueda.set(null);
    this.reiniciarLineas();
  }

  cambiarTipo(tipo: TipoDevolucion): void {
    this.tipo.set(tipo);
    if (tipo === 'devolucion') {
      this.itemsNuevosActuales.set([]);
      this.montoCambio.set(0);
    }
  }

  actualizarCantidadDevuelta(indice: number, cantidad: number): void {
    this.lineasDevueltas.update((actuales) =>
      actuales.map((linea, i) => {
        if (i !== indice) return linea;

        const cantidadValida = Math.max(0, Math.min(cantidad, linea.cantidadMaxima));

        return { ...linea, cantidad: cantidadValida };
      }),
    );
  }

  actualizarMerma(indice: number, vaAMerma: boolean): void {
    this.lineasDevueltas.update((actuales) => actuales.map((linea, i) => (i === indice ? { ...linea, vaAMerma } : linea)));
  }

  onLineasNuevasCambio(cambio: LineasProductoCambio): void {
    this.itemsNuevosActuales.set(cambio.items);
    this.montoCambio.set(cambio.subtotal);
  }

  onPagosCambio(cambio: LineasPagoCambio): void {
    this.pagosActuales.set(cambio.pagos);
    this.pagoCuadra.set(cambio.cuadra);
  }

  protected puedeRegistrar(): boolean {
    if (!this.ventaOrigen() || this.rechazoPorVentaSombra()) return false;
    if (this.lineasDevueltas().every((l) => l.cantidad <= 0)) return false;
    if (this.tipo() === 'cambio' && this.itemsNuevosActuales().length === 0) return false;
    if (this.pagoNecesario() && !this.pagoCuadra()) return false;

    return true;
  }

  registrarDevolucion(): void {
    const venta = this.ventaOrigen();
    if (!venta || !this.puedeRegistrar()) return;

    this.registrando.set(true);

    const payload: DevolucionFormPayload = {
      venta_id: venta.id,
      tipo: this.tipo(),
      items_devueltos: this.lineasDevueltas()
        .filter((l) => l.cantidad > 0)
        .map((l) => ({ variante_id: l.variante_id, cantidad: l.cantidad, va_a_merma: l.vaAMerma })),
      items_nuevos: this.tipo() === 'cambio' ? this.itemsNuevosActuales() : undefined,
      pagos: this.pagoNecesario() ? this.pagosActuales() : [],
      motivo: this.motivo().trim() || null,
    };

    this.devolucionService.registrar(payload).subscribe({
      next: (devolucion) => {
        this.registrando.set(false);
        this.toast.success('Devolución registrada.');
        this.router.navigate(['/devoluciones', devolucion.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.registrando.set(false);
        const cuerpo = error.error as ErrorNegocioTpv | undefined;
        this.toast.error(cuerpo?.message ?? 'No se pudo registrar la devolución.');
      },
    });
  }

  private reiniciarLineas(): void {
    this.lineasDevueltas.set([]);
    this.tipo.set('devolucion');
    this.itemsNuevosActuales.set([]);
    this.montoCambio.set(0);
    this.pagosActuales.set([]);
    this.pagoCuadra.set(false);
    this.motivo.set('');
  }
}
