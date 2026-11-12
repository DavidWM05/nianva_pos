import { MatButton } from '@angular/material/button';
import { BtnEnviarComponent, CampoComponent, InputDineroComponent, } from '@nianva/ui-forms';
import { CambioListado, ColumnaListado, MetaListado, TablaComponent } from '@nianva/ui-data';
import { DineroPipe, FechaPipe, } from '@nianva/ui-format';
import { BadgeComponent, SkeletonComponent, conUmbral } from '@nianva/ui-feedback';
import { DatosComponent, FormActionsComponent, PageComponent, PageHeaderComponent, } from '@nianva/ui-layout';
import { ModalComponent } from '@nianva/ui-overlays';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService, mensajeError } from '@nianva/ui-shared';
import { LineasPagoCambio, LineasPagoComponent } from '../../../tpv/lineas-pago/lineas-pago.component';
import { ApartadoService } from '../../apartado.service';
import { AbonoPagoPayload, Apartado, ApartadoDetallePermisos, ResultadoCancelacion } from '../../apartado.types';


const PERMISOS_VACIOS: ApartadoDetallePermisos = { abonar: false, cancelar: false };

function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}

/**
 * Vista de registro de un apartado -- General (datos + lineas), Abonos
 * (historial + "Registrar abono", reutiliza LineasPagoComponent de TPV
 * tal cual: mismo patron de pago mixto, solo cambia contra que monto
 * deben cuadrar los pagos -- aqui el monto del abono que el usuario
 * escribe, no el total de una venta), Auditoria (@defer, patron de
 * siempre). Sin creacion/edicion de lineas aqui -- eso vive en
 * ApartadoFormComponent (/apartados/nuevo).
 */
@Component({
  selector: 'nucleo-apartado-detalle',
  standalone: true,
  imports: [BtnEnviarComponent,FormsModule, LineasPagoComponent, NgTemplateOutlet, RecordTabsComponent, AuditLogViewerComponent, MatButton, CampoComponent, InputDineroComponent, TablaComponent, DineroPipe, FechaPipe, BadgeComponent, SkeletonComponent, DatosComponent, FormActionsComponent, PageComponent, PageHeaderComponent, ModalComponent, MatProgressSpinner],
  templateUrl: './apartado-detalle.component.html',
  styleUrl: './apartado-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApartadoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apartadoService = inject(ApartadoService);
  private readonly toast = inject(ToastService);

  @ViewChild(LineasPagoComponent) private lineasPagoRef?: LineasPagoComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-file' },
    { label: 'Abonos', icon: 'pi pi-wallet' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly apartado = signal<Apartado | null>(null);
  protected readonly permisos = signal<ApartadoDetallePermisos>(PERMISOS_VACIOS);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);

  protected readonly saldoPendiente = computed(() => {
    const apartado = this.apartado();
    if (!apartado) return 0;

    return Math.max(0, redondear(Number(apartado.total) - Number(apartado.total_abonado)));
  });

  protected readonly puedeLiquidar = computed(() => this.apartado()?.estado === 'activo' && this.saldoPendiente() <= 0);

  // -- Registrar abono --
  protected readonly montoAbono = signal<number | null>(null);
  protected readonly pagosAbono = signal<AbonoPagoPayload[]>([]);
  protected readonly pagoAbonoCuadra = signal(false);
  protected readonly registrandoAbono = signal(false);

  // -- Liquidar --
  protected readonly liquidando = signal(false);

  // -- Cancelar --
  protected readonly mostrarCancelacion = signal(false);
  protected readonly motivoCancelacion = signal('');
  protected readonly cancelando = signal(false);
  protected readonly resultadoCancelacion = signal<ResultadoCancelacion | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  protected cargar(id: number): void {
    this.cargando.set(true);
    this.error.set(false);
    this.apartadoService.obtener(id).subscribe({
      next: ({ apartado, permisos }) => {
        this.apartado.set(apartado);
        this.permisos.set(permisos);
        this.cargando.set(false);
      },
      error: () => { this.cargando.set(false); this.error.set(true); },
    });
  }

  protected etiquetaMetodosPago(pagos: { nombre: string | null }[]): string {
    if (pagos.length === 0) return '—';

    return pagos.map((p) => p.nombre ?? 'Método eliminado').join(' + ');
  }

  onPagosAbonoCambio(cambio: LineasPagoCambio): void {
    this.pagosAbono.set(cambio.pagos);
    this.pagoAbonoCuadra.set(cambio.cuadra);
  }

  registrarAbono(): void {
    const apartado = this.apartado();
    const monto = this.montoAbono();
    if (!apartado || monto === null || monto <= 0 || !this.pagoAbonoCuadra()) return;

    this.registrandoAbono.set(true);

    this.apartadoService.registrarAbono(apartado.id, { monto, pagos: this.pagosAbono() }).subscribe({
      next: (actualizado) => {
        this.apartado.set(actualizado);
        this.montoAbono.set(null);
        this.lineasPagoRef?.reiniciar();
        this.registrandoAbono.set(false);
        this.toast.success('Abono registrado.');
      },
      error: (error: HttpErrorResponse) => {
        this.registrandoAbono.set(false);
        this.toast.error(mensajeError(error, 'No se pudo registrar el abono.'));
      },
    });
  }

  liquidar(): void {
    const apartado = this.apartado();
    if (!apartado || !this.puedeLiquidar()) return;

    this.liquidando.set(true);

    this.apartadoService.liquidar(apartado.id).subscribe({
      next: (actualizado) => {
        this.apartado.set(actualizado);
        this.liquidando.set(false);
        this.toast.success('Apartado liquidado.');
      },
      error: (error: HttpErrorResponse) => {
        this.liquidando.set(false);
        this.toast.error(mensajeError(error, 'No se pudo liquidar el apartado.'));
      },
    });
  }

  abrirCancelacion(): void {
    this.motivoCancelacion.set('');
    this.mostrarCancelacion.set(true);
  }

  cerrarCancelacion(): void {
    this.mostrarCancelacion.set(false);
  }

  confirmarCancelacion(): void {
    const apartado = this.apartado();
    const motivo = this.motivoCancelacion().trim();
    if (!apartado || !motivo) return;

    this.cancelando.set(true);

    this.apartadoService.cancelar(apartado.id, motivo).subscribe({
      next: (resultado) => {
        this.apartado.set(resultado.apartado);
        this.resultadoCancelacion.set(resultado);
        this.cancelando.set(false);
        this.mostrarCancelacion.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cancelando.set(false);
        this.toast.error(mensajeError(error, 'No se pudo cancelar el apartado.'));
      },
    });
  }

  cerrarResultadoCancelacion(): void {
    this.resultadoCancelacion.set(null);
  }

  protected readonly paginaLineas = signal<CambioListado>({ page: 1, rows: 25, sortField: null, sortOrder: null });
  protected readonly todasLineas = computed(() => (this.apartado()?.detalles ?? []).map(d => ({ ...d, productoTexto: (d.variante?.producto_nombre ?? '') + (d.variante?.talla || d.variante?.color ? ' (' + (d.variante?.talla ?? '') + ' / ' + (d.variante?.color ?? '') + ')' : '') })));
  protected readonly filasLineas = computed(() => this.todasLineas().slice((this.paginaLineas().page - 1) * this.paginaLineas().rows, this.paginaLineas().page * this.paginaLineas().rows));
  protected readonly metaLineas = computed<MetaListado>(() => ({ total: this.todasLineas().length, page: this.paginaLineas().page, rows: this.paginaLineas().rows, filtros_aplicados: {}, permisos: {} }));
  protected readonly columnasLineas: ColumnaListado<ReturnType<typeof this.todasLineas>[number]>[] = [{ tipo: 'principal', campo: 'productoTexto', encabezado: 'Producto' },{ tipo: 'cantidad', campo: 'cantidad', encabezado: 'Cantidad', unidad: 'unidad(es)' },{ tipo: 'dinero', campo: 'precio_unitario', encabezado: 'Precio' },{ tipo: 'dinero', campo: 'subtotal', encabezado: 'Subtotal' }];

  protected readonly paginaAbonos = signal<CambioListado>({ page: 1, rows: 25, sortField: null, sortOrder: null });
  protected readonly todosAbonos = computed(() => (this.apartado()?.abonos ?? []).map(a => ({ ...a, metodosTexto: this.etiquetaMetodosPago(a.pagos) })));
  protected readonly filasAbonos = computed(() => this.todosAbonos().slice((this.paginaAbonos().page - 1) * this.paginaAbonos().rows, this.paginaAbonos().page * this.paginaAbonos().rows));
  protected readonly metaAbonos = computed<MetaListado>(() => ({ total: this.todosAbonos().length, page: this.paginaAbonos().page, rows: this.paginaAbonos().rows, filtros_aplicados: {}, permisos: {} }));
  protected readonly columnasAbonos: ColumnaListado<ReturnType<typeof this.todosAbonos>[number]>[] = [ { tipo: 'fechaHora', campo: 'fecha', encabezado: 'Fecha' }, { tipo: 'dinero', campo: 'monto', encabezado: 'Monto' }, { tipo: 'texto', campo: 'metodosTexto', encabezado: 'Pago' } ];

  protected readonly indicadorliquidando = conUmbral(this.liquidando);

}
