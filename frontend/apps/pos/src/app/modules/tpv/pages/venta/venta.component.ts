import { limitesDe } from '@nianva/api-contrato';
import { SesionActualService } from '@nianva/domain-sesion';
import { SelectorListaPrecioComponent } from '../../selector-lista-precio/selector-lista-precio.component';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnInit,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AtajosTecladoComponent, AtajoTeclado } from '@nianva/ui-actions';
import { SkeletonComponent } from '@nianva/ui-feedback';
import { FormActionsComponent, TactilComponent } from '@nianva/ui-layout';
import {
  BtnEnviarComponent,
  CampoComponent,
  InputDineroComponent,
  SelectFiltroComponent,
  SelectFiltroOpcion,
} from '@nianva/ui-forms';
import { aCentavos, DineroPipe } from '@nianva/ui-format';
import {
  EntidadSelectorComponent,
  ToastService,
  mensajeError,
} from '@nianva/ui-shared';

import { finalize } from 'rxjs';
import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { ImprimirDocumentoService } from '../../../../core/impresos/imprimir-documento.service';
import { PreferenciaTicketService } from '../../../../core/impresos/preferencia-ticket.service';
import { IntentoOperacion } from '../../../../core/operaciones/intento-operacion';
import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { NotaCredito, NotaCreditoService } from '@nianva/domain-notas-credito';
import { CajaService, CajaSesion, CuponValidacion, CuponValidacionService, Venta, VentaFormPayload, VentaItemPayload, VentaPagoPayload, VentaService } from '@nianva/domain-tpv';
import {
  LineasPagoCambio,
  LineasPagoComponent,
} from '../../lineas-pago/lineas-pago.component';
import {
  LineasProductoCambio,
  LineasProductoComponent,
} from '../../lineas-producto/lineas-producto.component';

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
  imports: [
    FormsModule,
    SelectorListaPrecioComponent,
    RouterLink,
    EntidadSelectorComponent,
    LineasProductoComponent,
    LineasPagoComponent,
    MatButton,
    SkeletonComponent,
    BtnEnviarComponent,
    CampoComponent,
    InputDineroComponent,
    SelectFiltroComponent,
    DineroPipe,
    AtajosTecladoComponent,
    FormActionsComponent,
    TactilComponent,
  ],
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
  private readonly supervisor = inject(AutorizacionSupervisorService);
  private readonly preferenciaTicket = inject(PreferenciaTicketService);
  /** UI-12: el ticket de la venta recién registrada, con el ancho de papel de esta terminal. */
  protected readonly impresion = inject(ImprimirDocumentoService);
  /**
   * API-07 y SEG-05: llave y token de la venta en curso. Si el carrito, el pago o el descuento
   * cambian, el cuerpo es otro: llave nueva y el token del supervisor se descarta.
   */
  private readonly intentoVenta = new IntentoOperacion();

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);

  @ViewChild(LineasProductoComponent)
  private lineasProductoRef!: LineasProductoComponent;
  @ViewChild(LineasPagoComponent) private lineasPagoRef!: LineasPagoComponent;
  @ViewChild('confirmacion') private confirmacionRef?: ElementRef<HTMLElement>;
  private readonly injector = inject(Injector);

  /** Limites del contrato (UI-11b). El codigo de cupon mide lo que acepta el catalogo de cupones. */
  protected readonly limitesVenta = limitesDe('/ventas', 'post');
  protected readonly limitesCupon = limitesDe('/cupones', 'post');
  /** UI-17: los atajos de onAtajoTeclado(), documentados en pantalla. */
  protected readonly atajos: readonly AtajoTeclado[] = [
    { teclas: ['F2'], accion: 'Buscar producto' },
    { teclas: ['F4', 'F9'], accion: 'Cobrar' },
    { teclas: ['Esc'], accion: 'Cancelar línea' },
  ];
  protected readonly cargandoCaja = signal(true);
  protected readonly cajaAbierta = signal<CajaSesion | null>(null);

  private readonly sesionActual = inject(SesionActualService);
  protected readonly puedeElegirLista = computed(
    () =>
      this.sesionActual.sesion()?.permisos.includes('precios.elegir_lista') ??
      false,
  );
  protected readonly listaPrecioId = signal<number | null>(null);
  protected readonly clienteId = signal<string | null>(null);

  // -- Carrito (delegado a LineasProductoComponent) --
  protected readonly itemsActuales = signal<VentaItemPayload[]>([]);
  protected readonly subtotal = signal(0);

  // -- Cupon --
  protected readonly cuponCodigo = signal('');
  protected readonly cuponAplicado = signal<CuponValidacion | null>(null);
  protected readonly validandoCupon = signal(false);

  // -- Descuento manual (SEG-05) --
  // Importe en MXN, como lo recibe el servidor (`descuento_manual`), de 0 al subtotal. Arriba del
  // margen que fija el servidor, la venta pide un supervisor (`ventas.descuento`).
  protected readonly descuentoManual = signal<number | null>(null);
  protected readonly descuentoValido = computed(() => {
    const descuento = this.descuentoManual();

    return descuento === null || (descuento >= 0 && aCentavos(descuento) <= aCentavos(this.subtotal()));
  });

  protected readonly total = computed(() => {
    const descuento = this.cuponAplicado()?.descuento ?? 0;
    const manual = this.descuentoValido() ? (this.descuentoManual() ?? 0) : 0;

    return Math.max(0, aCentavos(this.subtotal()) - aCentavos(descuento) - aCentavos(manual)) / 100;
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
  // DAT-08: ulid de la nota de crédito elegida.
  protected readonly notaCreditoSeleccionadaId = signal<string | null>(null);
  protected readonly notasCreditoOpciones = computed(() =>
    this.notasCreditoDisponibles().map((n) => ({
      id: n.id,
      label: `$${n.saldo_disponible} disponibles (nota #${n.id})`,
    })),
  );
  // Sin nota de credito es una opcion mas: el select de libs/ui no tiene boton de limpiar.
  protected readonly opcionesNotaCredito = computed<SelectFiltroOpcion[]>(
    () => [
      { label: 'Sin nota de crédito', value: null },
      ...this.notasCreditoOpciones().map((opcion) => ({
        label: opcion.label,
        value: opcion.id,
      })),
    ],
  );
  protected readonly montoNotaCredito = computed(() => {
    const nota = this.notasCreditoDisponibles().find(
      (n) => n.id === this.notaCreditoSeleccionadaId(),
    );

    return nota
      ? Math.min(aCentavos(nota.saldo_disponible), aCentavos(this.total())) /
          100
      : 0;
  });

  // Lo que le queda por cubrir a LineasPagoComponent (efectivo/tarjeta/etc)
  // despues de restar lo que se espera cubrir con gift card + nota de
  // credito.
  protected readonly montoObjetivoPago = computed(() => {
    const giftCardEstimado = this.giftCardCodigo().trim()
      ? (this.giftCardMontoEstimado() ?? 0)
      : 0;

    return (
      Math.max(
        0,
        aCentavos(this.total()) -
          aCentavos(giftCardEstimado) -
          aCentavos(this.montoNotaCredito()),
      ) / 100
    );
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
    () =>
      this.pagoCuadra() &&
      this.clienteId() !== null &&
      this.itemsActuales().length > 0 &&
      this.descuentoValido(),
  );

  protected readonly mensajeBloqueo = computed<string | null>(() => {
    if (this.itemsActuales().length === 0)
      return 'Agrega al menos un producto al carrito.';
    if (this.clienteId() === null)
      return 'Selecciona un cliente para continuar.';
    if (!this.descuentoValido())
      return 'El descuento debe estar entre $0 y el subtotal.';
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
      const publicoGeneral =
        resultados.find((r) => r.nombre === 'Publico General') ?? resultados[0];
      if (publicoGeneral && this.clienteId() === null) {
        this.onClienteSeleccionado(publicoGeneral.id);
      }
    });
  }

  /** Cambiar de cliente invalida las notas de credito ya listadas -- pertenecen al cliente anterior. */
  onClienteSeleccionado(clienteId: string | null): void {
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
    if (this.cargandoCaja() || !this.cajaAbierta() || this.ventaRegistrada())
      return;
    // UI-17: un overlay abierto (sugerencias, lista de variantes o de metodos de pago) atiende su
    // tecla antes y la marca como atendida. Sin esta guarda, el Esc que cerraba la lista de
    // variantes tambien descartaba el producto elegido.
    if (event.defaultPrevented) return;

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
        this.toast.error(mensajeError(error, 'Cupón inválido.'));
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
      ...(this.listaPrecioId() !== null
        ? { lista_precio_id: this.listaPrecioId() }
        : {}),
      items: this.itemsActuales(),
      pagos: this.pagosActuales(),
      cupon_codigo: this.cuponAplicado()?.cupon.codigo ?? null,
      gift_card_codigo: this.giftCardCodigo().trim() || null,
      nota_credito_id: this.notaCreditoSeleccionadaId(),
      // Solo si hay descuento: sin el, el cuerpo es el mismo de siempre.
      ...(this.descuentoManual() ? { descuento_manual: this.descuentoManual() } : {}),
    };

    this.supervisor
      .ejecutar(
        this.intentoVenta,
        { accion: 'ventas.descuento', datos: { ...payload }, descripcion: 'Aplicar un descuento fuera del margen' },
        (llave, token) => this.ventaService.registrar(payload, llave, token),
      )
      // Si se cancela el dialogo del supervisor no hay respuesta: se libera el boton igual.
      .pipe(finalize(() => this.registrando.set(false)))
      .subscribe({
        next: (venta) => {
          this.registrando.set(false);
          this.ventaRegistrada.set(venta);
          this.reiniciarCarrito();
          // UI-17: el formulario desaparece; el foco pasa a la confirmacion en lugar de perderse.
          afterNextRender(() => this.confirmacionRef?.nativeElement.focus(), { injector: this.injector });
        },
        error: (error: HttpErrorResponse) => {
          this.registrando.set(false);
          this.toast.error(mensajeError(error, 'No se pudo registrar la venta.'));
        },
      });
  }

  /** Imprime el ticket desde la foto de la venta: no la registra ni la cobra otra vez. */
  imprimirTicket(venta: Venta): void {
    this.impresion.imprimir({ tipo: 'venta', venta: venta.id }, this.preferenciaTicket.ancho()).subscribe({ error: () => undefined });
  }

  nuevaVenta(): void {
    this.listaPrecioId.set(null);
    this.ventaRegistrada.set(null);
    // De vuelta a la captura, con el foco listo para el primer producto.
    afterNextRender(() => this.lineasProductoRef?.focusBuscador(), { injector: this.injector });
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
    this.descuentoManual.set(null);
  }
}
