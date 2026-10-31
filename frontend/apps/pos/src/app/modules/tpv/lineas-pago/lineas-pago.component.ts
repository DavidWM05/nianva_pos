import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { MetodoPago } from '../metodo-pago.types';
import { MetodoPagoService } from '../metodo-pago.service';
import { VentaPagoPayload } from '../venta.types';

interface LineaPagoForm {
  metodo_pago_id: number | null;
  monto: number | null;
}

/**
 * Gift Card y Nota de Credito son metodos_pago reales (ver
 * MetodosPagoSeeder), pero VentaController::store() los procesa de forma
 * especial via `gift_card_codigo`/`nota_credito_id` (valida saldo/vigencia
 * y descuenta) -- si aparecieran aqui como una linea de pago generica mas,
 * el cajero podria "cobrar" con una gift card sin validar su codigo ni
 * descontar saldo real. Se excluyen de este selector generico; la pantalla
 * de venta los captura por separado (ver VentaComponent).
 */
const METODOS_EXCLUIDOS_DE_PAGO_GENERICO = ['Gift Card', 'Nota de Crédito'];

export interface LineasPagoCambio {
  pagos: VentaPagoPayload[];
  cuadra: boolean;
  suma: number;
}

function centavos(monto: number): number {
  return Math.round(monto * 100);
}

/**
 * N lineas de metodo de pago + monto ("pago mixto"), extraido de
 * VentaComponent (TPV) -- lo reutiliza tal cual "Registrar abono" en la
 * vista de registro de un apartado (ver ApartadoDetalleComponent). La
 * unica diferencia entre ambos usos es contra que monto deben cuadrar
 * los pagos (el total de la venta vs. el monto del abono que el usuario
 * captura) -- por eso ese monto entra por @Input en vez de estar fijo.
 */
@Component({
  selector: 'nucleo-lineas-pago',
  standalone: true,
  imports: [FormsModule, Button, InputText, Select],
  templateUrl: './lineas-pago.component.html',
  styleUrl: './lineas-pago.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineasPagoComponent implements OnInit, OnChanges {
  private readonly metodoPagoService = inject(MetodoPagoService);

  @Input({ required: true }) montoObjetivo!: number;
  @Output() cambio = new EventEmitter<LineasPagoCambio>();

  protected readonly metodosPago = signal<MetodoPago[]>([]);
  protected readonly pagos = signal<LineaPagoForm[]>([{ metodo_pago_id: null, monto: null }]);

  // `montoObjetivo` es un @Input plano (no signal) -- un computed() que lo
  // leyera directamente NUNCA se recalcularia cuando cambia (computed()
  // solo trackea lecturas de signals, no propiedades planas), dejando
  // pagoCuadra() con el valor cacheado de la PRIMERA evaluacion para
  // siempre. Se refleja aqui en un signal propio (actualizado en
  // ngOnChanges) para que pagoCuadra si reaccione cuando el padre cambia
  // el monto objetivo (ej. el total de la venta cambia al agregar una
  // linea).
  private readonly montoObjetivoSignal = signal(0);

  protected readonly sumaPagos = computed(() =>
    Math.round(this.pagos().reduce((acumulado, pago) => acumulado + (pago.monto ?? 0), 0) * 100) / 100,
  );
  protected readonly pagoCuadra = computed(() => centavos(this.sumaPagos()) === centavos(this.montoObjetivoSignal()));

  ngOnInit(): void {
    this.metodoPagoService.listar().subscribe((metodos) =>
      this.metodosPago.set(metodos.filter((m) => !METODOS_EXCLUIDOS_DE_PAGO_GENERICO.includes(m.nombre))),
    );
  }

  ngOnChanges(): void {
    this.montoObjetivoSignal.set(this.montoObjetivo ?? 0);
    this.emitirCambio();
  }

  agregarLineaPago(): void {
    this.pagos.update((actuales) => [...actuales, { metodo_pago_id: null, monto: null }]);
    this.emitirCambio();
  }

  quitarLineaPago(indice: number): void {
    this.pagos.update((actuales) => actuales.filter((_, i) => i !== indice));
    this.emitirCambio();
  }

  actualizarMetodoPago(indice: number, metodoPagoId: number): void {
    this.pagos.update((actuales) => actuales.map((p, i) => (i === indice ? { ...p, metodo_pago_id: metodoPagoId } : p)));
    this.emitirCambio();
  }

  actualizarMontoPago(indice: number, monto: number): void {
    this.pagos.update((actuales) => actuales.map((p, i) => (i === indice ? { ...p, monto } : p)));
    this.emitirCambio();
  }

  /** Limpia las lineas de pago -- lo llama el padre (via ViewChild) tras registrar con exito. */
  reiniciar(): void {
    this.pagos.set([{ metodo_pago_id: null, monto: null }]);
    this.emitirCambio();
  }

  private emitirCambio(): void {
    this.cambio.emit({
      pagos: this.pagos()
        .filter((p): p is { metodo_pago_id: number; monto: number } => p.metodo_pago_id !== null && p.monto !== null)
        .map((p) => ({ metodo_pago_id: p.metodo_pago_id, monto: p.monto })),
      cuadra: this.pagoCuadra(),
      suma: this.sumaPagos(),
    });
  }
}
