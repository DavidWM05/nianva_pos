import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EntidadSelectorComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { NotaCreditoService } from '../../../notas-credito/nota-credito.service';
import { NotaCredito } from '../../../notas-credito/nota-credito.types';
import { CajaService } from '../../caja.service';
import { CajaSesion } from '../../caja.types';
import { CuponValidacion, CuponValidacionService } from '../../cupon-validacion.service';
import { LineasPagoCambio, LineasPagoComponent } from '../../lineas-pago/lineas-pago.component';
import { LineasProductoCambio, LineasProductoComponent } from '../../lineas-producto/lineas-producto.component';
import { ErrorNegocioTpv } from '../../tpv-error.types';
import { Venta, VentaFormPayload, VentaItemPayload, VentaPagoPayload } from '../../venta.types';
import { VentaService } from '../../venta.service';

/**
 * Vista de venta: flujo de captura de punto de venta, no una lista+registro
 * como los modulos anteriores (ver el reporte, punto 1). Bloquea la
 * captura si no hay caja abierta para la sucursal del usuario (punto 2) --
 * la decision fue mostrar un panel explicativo con link a /tpv/caja en vez
 * de un guard de ruta, para que el mensaje sea claro en vez de un
 * redirect silencioso.
 *
 * El carrito (LineasProductoComponent) y las lineas de pago
 * (LineasPagoComponent) son componentes propios extraidos de aqui --
 * Apartados los reutiliza tal cual para "crear apartado" y "registrar
 * abono" respectivamente (ver el reporte del modulo Apartados). Este
 * componente solo orquesta: cliente, cupon (especifico de venta, no
 * aplica a apartados) y el registro final.
 */
@Component({
  selector: 'nucleo-venta',
  standalone: true,
  imports: [FormsModule, RouterLink, EntidadSelectorComponent, LineasProductoComponent, LineasPagoComponent, Button, InputText, Select],
  templateUrl: './venta.component.html',
  styleUrl: './venta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentaComponent implements OnInit {
  private readonly cajaService = inject(CajaService);
  private readonly ventaService = inject(VentaService);
  private readonly cuponValidacionService = inject(CuponValidacionService);
  private readonly notaCreditoService = inject(NotaCreditoService);
  private readonly toast = inject(ToastService);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);

  @ViewChild(LineasProductoComponent) private lineasProductoRef!: LineasProductoComponent;
  @ViewChild(LineasPagoComponent) private lineasPagoRef!: LineasPagoComponent;

  protected readonly cargandoCaja = signal(true);
  protected readonly cajaAbierta = signal<CajaSesion | null>(null);

  protected readonly clienteId = signal<number | null>(null);

  // -- Carrito (delegado a LineasProductoComponent) --
  protected readonly itemsActuales = signal<VentaItemPayload[]>([]);
  protected readonly subtotal = signal(0);

  // -- Cupon --
  protected readonly cuponCodigo = signal('');
  protected readonly cuponAplicado = signal<CuponValidacion | null>(null);
  protected readonly validandoCupon = signal(false);

  protected readonly total = computed(() => {
    const descuento = this.cuponAplicado()?.descuento ?? 0;

    return Math.max(0, Math.round((this.subtotal() - descuento) * 100) / 100);
  });

  // -- Gift Card --
  // VentaController::store() no lee un monto para la gift card: aplica
  // min(saldo_actual, total) automaticamente y no hay endpoint para
  // consultar el saldo por codigo antes de cobrar. `giftCardMontoEstimado`
  // es SOLO una estimacion local del cajero (lo que espera que la gift
  // card cubra) para calcular cuanto falta en metodos de pago tradicionales
  // -- si la estimacion no coincide con el saldo real, el backend rechaza
  // con pago_no_cuadra y el cajero ajusta.
  protected readonly giftCardCodigo = signal('');
  protected readonly giftCardMontoEstimado = signal<number | null>(null);

  // -- Nota de Credito --
  // A diferencia de la gift card, aqui si se conoce el saldo real de
  // antemano (NotaCreditoService.activasPorCliente ya lo trae), asi que el
  // monto a aplicar se calcula exacto, sin que el cajero tenga que adivinar.
  protected readonly notasCreditoDisponibles = signal<NotaCredito[]>([]);
  protected readonly notaCreditoSeleccionadaId = signal<number | null>(null);
  protected readonly notasCreditoOpciones = computed(() =>
    this.notasCreditoDisponibles().map((n) => ({ id: n.id, label: `$${n.saldo_disponible} disponibles (nota #${n.id})` })),
  );
  protected readonly montoNotaCredito = computed(() => {
    const nota = this.notasCreditoDisponibles().find((n) => n.id === this.notaCreditoSeleccionadaId());

    return nota ? Math.min(parseFloat(nota.saldo_disponible), this.total()) : 0;
  });

  // Lo que le queda por cubrir a LineasPagoComponent (efectivo/tarjeta/etc)
  // despues de restar lo que se espera cubrir con gift card + nota de
  // credito.
  protected readonly montoObjetivoPago = computed(() => {
    const giftCardEstimado = this.giftCardCodigo().trim() ? (this.giftCardMontoEstimado() ?? 0) : 0;

    return Math.max(0, Math.round((this.total() - giftCardEstimado - this.montoNotaCredito()) * 100) / 100);
  });

  // -- Pagos (delegado a LineasPagoComponent) --
  protected readonly pagosActuales = signal<VentaPagoPayload[]>([]);
  protected readonly pagoCuadra = signal(false);

  protected readonly registrando = signal(false);
  protected readonly ventaRegistrada = signal<Venta | null>(null);

  // Antes el boton "Registrar venta" solo miraba pagoCuadra() -- si el
  // cajero limpiaba el cliente despues de que el pago ya cuadraba, el
  // boton seguia habilitado pero registrarVenta() regresaba en silencio
  // (por el guard `clienteId === null` de mas abajo), sin feedback. Un
  // solo computed() centraliza la condicion real, y mensajeBloqueo()
  // explica cual falta mientras el usuario captura (regla de "feedback en
  // caliente", no solo al someter).
  protected readonly puedeRegistrar = computed(
    () => this.pagoCuadra() && this.clienteId() !== null && this.itemsActuales().length > 0,
  );

  protected readonly mensajeBloqueo = computed<string | null>(() => {
    if (this.itemsActuales().length === 0) return 'Agrega al menos un producto al carrito.';
    if (this.clienteId() === null) return 'Selecciona un cliente para continuar.';
    if (!this.pagoCuadra()) return 'El pago todavía no cuadra con el total.';

    return null;
  });

  ngOnInit(): void {
    this.cajaService.actual().subscribe({
      next: (estado) => {
        this.cajaAbierta.set(estado.sesion);
        this.cargandoCaja.set(false);
      },
      error: () => this.cargandoCaja.set(false),
    });

    // Default a "Publico General" si el usuario no elige un cliente --
    // ver ClienteObserver/TenantObserver en el backend, que siembra ese
    // cliente de sistema para cada tenant. Se resuelve buscandolo por
    // nombre (BuscadorEntidad no expone un metodo dedicado "cliente por
    // defecto") -- si por lo que sea no aparece, el campo queda vacio y
    // el usuario debe elegir un cliente a mano.
    this.buscadorCliente.buscar('Publico General').subscribe((resultados) => {
      const publicoGeneral = resultados.find((r) => r.nombre === 'Publico General') ?? resultados[0];
      if (publicoGeneral && this.clienteId() === null) {
        this.onClienteSeleccionado(publicoGeneral.id);
      }
    });
  }

  /** Cambiar de cliente invalida las notas de credito ya listadas -- pertenecen al cliente anterior. */
  onClienteSeleccionado(clienteId: number | null): void {
    this.clienteId.set(clienteId);
    this.notaCreditoSeleccionadaId.set(null);
    this.notasCreditoDisponibles.set([]);

    if (clienteId === null) return;

    this.notaCreditoService.activasPorCliente(clienteId).subscribe({
      next: (notas) => this.notasCreditoDisponibles.set(notas),
      error: () => this.notasCreditoDisponibles.set([]),
    });
  }

  /**
   * Atajos de teclado del POS -- diferenciador explicito de esta skill
   * frente al resto de Núcleo (ver el reporte). Solo activos mientras se
   * esta capturando una venta (mismo guard que la plantilla:
   * cargandoCaja/cajaAbierta/ventaRegistrada), para no interferir con la
   * pantalla de bloqueo por caja cerrada ni con la de confirmacion.
   *
   * F2 busca producto, F4/F9 intentan cobrar (dos teclas para el mismo
   * gesto porque distintos teclados de POS mapean "cobrar" a una u otra),
   * ESC cancela la linea en curso (producto/variante/cantidad todavia sin
   * agregar al carrito -- ver LineasProductoComponent.cancelarLineaEnCurso()).
   */
  @HostListener('window:keydown', ['$event'])
  protected onAtajoTeclado(event: KeyboardEvent): void {
    if (this.cargandoCaja() || !this.cajaAbierta() || this.ventaRegistrada()) return;

    switch (event.key) {
      case 'F2':
        event.preventDefault();
        this.lineasProductoRef.focusBuscador();
        break;
      case 'F4':
      case 'F9':
        event.preventDefault();
        this.intentarCobrar();
        break;
      case 'Escape':
        event.preventDefault();
        this.lineasProductoRef.cancelarLineaEnCurso();
        break;
    }
  }

  /** Mismo gesto que el boton "Registrar venta", pero con feedback explicito si algo falta (ver mensajeBloqueo()). */
  protected intentarCobrar(): void {
    if (!this.puedeRegistrar()) {
      const motivo = this.mensajeBloqueo();
      if (motivo) this.toast.warn(motivo);

      return;
    }

    this.registrarVenta();
  }

  onLineasCambio(cambio: LineasProductoCambio): void {
    this.itemsActuales.set(cambio.items);
    this.subtotal.set(cambio.subtotal);
    // El cupon esta atado a un total que acaba de cambiar -- se pide
    // reaplicar a mano en vez de recalcularlo solo, para que el usuario
    // vea explicitamente el nuevo descuento.
    this.cuponAplicado.set(null);
  }

  onPagosCambio(cambio: LineasPagoCambio): void {
    this.pagosActuales.set(cambio.pagos);
    this.pagoCuadra.set(cambio.cuadra && this.itemsActuales().length > 0);
  }

  aplicarCupon(): void {
    const codigo = this.cuponCodigo().trim();
    if (!codigo) return;

    this.validandoCupon.set(true);

    this.cuponValidacionService.validar(codigo, this.subtotal()).subscribe({
      next: (resultado) => {
        this.cuponAplicado.set(resultado);
        this.validandoCupon.set(false);
        this.toast.success('Cupón aplicado.');
      },
      error: (error: HttpErrorResponse) => {
        this.validandoCupon.set(false);
        this.cuponAplicado.set(null);
        this.toast.error(this.mensajeError(error, 'Cupón inválido.'));
      },
    });
  }

  quitarCupon(): void {
    this.cuponAplicado.set(null);
    this.cuponCodigo.set('');
  }

  registrarVenta(): void {
    const clienteId = this.clienteId();
    if (!this.puedeRegistrar() || clienteId === null) return;

    this.registrando.set(true);

    const payload: VentaFormPayload = {
      cliente_id: clienteId,
      items: this.itemsActuales(),
      pagos: this.pagosActuales(),
      cupon_codigo: this.cuponAplicado()?.cupon.codigo ?? null,
      gift_card_codigo: this.giftCardCodigo().trim() || null,
      nota_credito_id: this.notaCreditoSeleccionadaId(),
    };

    this.ventaService.registrar(payload).subscribe({
      next: (venta) => {
        this.registrando.set(false);
        this.ventaRegistrada.set(venta);
        this.reiniciarCarrito();
      },
      error: (error: HttpErrorResponse) => {
        this.registrando.set(false);
        this.toast.error(this.mensajeError(error, 'No se pudo registrar la venta.'));
      },
    });
  }

  nuevaVenta(): void {
    this.ventaRegistrada.set(null);
  }

  private reiniciarCarrito(): void {
    this.lineasProductoRef.reiniciar();
    this.lineasPagoRef.reiniciar();
    this.subtotal.set(0);
    this.itemsActuales.set([]);
    this.cuponAplicado.set(null);
    this.cuponCodigo.set('');
    this.giftCardCodigo.set('');
    this.giftCardMontoEstimado.set(null);
    this.notaCreditoSeleccionadaId.set(null);
  }

  private mensajeError(error: HttpErrorResponse, fallback: string): string {
    const cuerpo = error.error as ErrorNegocioTpv | undefined;

    return cuerpo?.message ?? fallback;
  }
}
