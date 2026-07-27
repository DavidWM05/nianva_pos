import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EntidadSelectorComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
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
  imports: [FormsModule, RouterLink, EntidadSelectorComponent, LineasProductoComponent, LineasPagoComponent, Button, InputText],
  templateUrl: './venta.component.html',
  styleUrl: './venta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentaComponent implements OnInit {
  private readonly cajaService = inject(CajaService);
  private readonly ventaService = inject(VentaService);
  private readonly cuponValidacionService = inject(CuponValidacionService);
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

  // -- Pagos (delegado a LineasPagoComponent) --
  protected readonly pagosActuales = signal<VentaPagoPayload[]>([]);
  protected readonly pagoCuadra = signal(false);

  protected readonly registrando = signal(false);
  protected readonly ventaRegistrada = signal<Venta | null>(null);

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
        this.clienteId.set(publicoGeneral.id);
      }
    });
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
    if (!this.pagoCuadra() || clienteId === null) return;

    this.registrando.set(true);

    const payload: VentaFormPayload = {
      cliente_id: clienteId,
      items: this.itemsActuales(),
      pagos: this.pagosActuales(),
      cupon_codigo: this.cuponAplicado()?.cupon.codigo ?? null,
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
  }

  private mensajeError(error: HttpErrorResponse, fallback: string): string {
    const cuerpo = error.error as ErrorNegocioTpv | undefined;

    return cuerpo?.message ?? fallback;
  }
}
