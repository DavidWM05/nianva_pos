import { MatButton } from '@angular/material/button';
import { BtnEnviarComponent, CampoComponent, InputCantidadComponent, aplicarErroresServidor } from '@nianva/ui-forms';
import { DineroPipe, CantidadPipe } from '@nianva/ui-format';
import { AlertComponent, conUmbral } from '@nianva/ui-feedback';
import { FormActionsComponent, PageComponent, PageHeaderComponent, SectionComponent, PantallaService } from '@nianva/ui-layout';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService, erroresValidacion } from '@nianva/ui-shared';
import { LineasPagoCambio, LineasPagoComponent } from '../../../tpv/lineas-pago/lineas-pago.component';
import { LineasProductoCambio, LineasProductoComponent } from '../../../tpv/lineas-producto/lineas-producto.component';
import { ErrorNegocioTpv } from '../../../tpv/tpv-error.types';
import { Venta, VentaItemPayload, VentaPagoPayload } from '../../../tpv/venta.types';
import { VentaService } from '../../../tpv/venta.service';
import { DevolucionService } from '../../devolucion.service';
import { DevolucionFormPayload, TipoDevolucion, TipoReembolso } from '../../devolucion.types';


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
  imports: [ReactiveFormsModule,MatCheckbox,CampoComponent,InputCantidadComponent,SectionComponent,CantidadPipe,FormsModule,RouterLink,LineasProductoComponent,LineasPagoComponent,MatButton,BtnEnviarComponent,DineroPipe,AlertComponent,FormActionsComponent,PageComponent,PageHeaderComponent,MatProgressSpinner],
  templateUrl: './devolucion-form.component.html',
  styleUrl: './devolucion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevolucionFormComponent implements OnInit {
  protected readonly pantalla = inject(PantallaService);
  readonly formularioLineas = new FormGroup({ items_devueltos: new FormArray<FormGroup<{ cantidad: FormControl<number>; va_a_merma: FormControl<boolean> }>>([]) });
  protected readonly gruposLineas = this.formularioLineas.controls.items_devueltos;
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

  // Solo importa cuando la tienda le debe dinero al cliente (diferencia<0)
  // -- DevolucionController::store() ignora tipo_reembolso en cualquier
  // otro caso. Si se elige 'nota_credito', crea una Nota de Credito por
  // monto_devolucion (ver el docblock de DevolucionNotaCreditoInfo).
  protected readonly requiereEleccionReembolso = computed(() => this.diferenciaEstimada() < 0);
  protected readonly tipoReembolso = signal<TipoReembolso>('efectivo');

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
        this.gruposLineas.clear({ emitEvent: false });
        for (const linea of this.lineasDevueltas()) {
          const grupo = new FormGroup({
            cantidad: new FormControl(linea.cantidad, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(linea.cantidadMaxima)] }),
            va_a_merma: new FormControl(linea.vaAMerma, { nonNullable: true }),
          });
          this.gruposLineas.push(grupo, { emitEvent: false });
          grupo.controls.cantidad.valueChanges.subscribe(valor => {
            if (grupo.controls.cantidad.valid) this.actualizarCantidadDevuelta(this.gruposLineas.controls.indexOf(grupo), valor);
          });
          grupo.controls.va_a_merma.valueChanges.subscribe(valor => this.actualizarMerma(this.gruposLineas.controls.indexOf(grupo), valor));
        }
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
    this.gruposLineas.at(indice)?.controls.cantidad.setValue(this.lineasDevueltas()[indice].cantidad, { emitEvent: false });
  }

  actualizarMerma(indice: number, vaAMerma: boolean): void {
    this.lineasDevueltas.update((actuales) => actuales.map((linea, i) => (i === indice ? { ...linea, vaAMerma } : linea)));
    this.gruposLineas.at(indice)?.controls.va_a_merma.setValue(vaAMerma, { emitEvent: false });
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
    if (!this.ventaOrigen() || this.rechazoPorVentaSombra() || this.formularioLineas.invalid) return false;
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
      tipo_reembolso: this.requiereEleccionReembolso() ? this.tipoReembolso() : null,
    };

    const indicesEnviados = this.lineasDevueltas().flatMap((linea, indice) => linea.cantidad > 0 ? [indice] : []);
    this.devolucionService.registrar(payload).subscribe({
      next: ({ devolucion, notaCredito }) => {
        this.registrando.set(false);
        this.toast.success(
          notaCredito
            ? `Devolución registrada. Nota de crédito #${notaCredito.id} generada por $${notaCredito.monto_original}.`
            : 'Devolución registrada.',
        );
        this.router.navigate(['/devoluciones', devolucion.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.registrando.set(false);
        const errores = Object.fromEntries(Object.entries(erroresValidacion(error)).map(([clave, mensajes]) => [
          clave.replace(/^items_devueltos\.(\d+)\./, (_, indice: string) => 'items_devueltos.' + indicesEnviados[Number(indice)] + '.'), mensajes,
        ]));
        aplicarErroresServidor(this.formularioLineas, { error: { errors: errores } });
        const cuerpo = error.error as ErrorNegocioTpv | undefined;
        this.toast.error(cuerpo?.message ?? 'No se pudo registrar la devolución.');
      },
    });
  }

  private reiniciarLineas(): void {
    this.gruposLineas.clear({ emitEvent: false });
    this.lineasDevueltas.set([]);
    this.tipo.set('devolucion');
    this.itemsNuevosActuales.set([]);
    this.montoCambio.set(0);
    this.pagosActuales.set([]);
    this.pagoCuadra.set(false);
    this.tipoReembolso.set('efectivo');
    this.motivo.set('');
  }
  protected readonly indicadorcargandoVenta = conUmbral(this.cargandoVenta);

}
