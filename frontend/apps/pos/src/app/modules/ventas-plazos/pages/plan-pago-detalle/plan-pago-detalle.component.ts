import { FormActionsComponent } from '@nianva/ui-layout';
import {
  BtnEnviarComponent,
  CampoComponent,
  InputDineroComponent,
} from '@nianva/ui-forms';
import { ModalComponent } from '@nianva/ui-overlays';
import {
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { SkeletonComponent } from '@nianva/ui-feedback';
import {
  DineroPipe,
  FechaPipe,
  CantidadPipe,
  PorcentajePipe,
} from '@nianva/ui-format';
import {
  DatosComponent,
  PageComponent,
  PageHeaderComponent,
  SectionComponent,
} from '@nianva/ui-layout';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  AuditLogViewerComponent,
  RecordTabConfig,
  RecordTabsComponent,
  ToastService,
  esErrorNegocio,
  mensajeError,
} from '@nianva/ui-shared';

import { PlanPagoService } from '../../plan-pago.service';
import { PlanPago, PlanPagoCuota } from '../../plan-pago.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Sin permisos de gating: mismo criterio que Préstamos/Gift Cards -- se
 * muestran las acciones siempre y el 403 real (si aplica) se ve como toast.
 */
@Component({
  selector: 'nucleo-plan-pago-detalle',
  standalone: true,
  imports: [
    BtnEnviarComponent,
    CampoComponent,
    InputDineroComponent,
    ModalComponent,
    FormActionsComponent,
    FormsModule,
    RecordTabsComponent,
    AuditLogViewerComponent,
    PageComponent,
    PageHeaderComponent,
    SectionComponent,
    DatosComponent,
    TablaComponent,
    SkeletonComponent,
    DineroPipe,
    FechaPipe,
    CantidadPipe,
    PorcentajePipe,
  ],
  templateUrl: './plan-pago-detalle.component.html',
  styleUrl: './plan-pago-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanPagoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly planPagoService = inject(PlanPagoService);
  private readonly toast = inject(ToastService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Plan de pago', icon: 'pi pi-calendar-clock' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly plan = signal<PlanPago | null>(null);

  // -- Pagar cuota --
  protected readonly cuotaAPagar = signal<PlanPagoCuota | null>(null);
  protected readonly montoPago = signal<number | null>(null);
  protected readonly pagando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  abrirPagarCuota(cuota: PlanPagoCuota): void {
    this.cuotaAPagar.set(cuota);
    this.montoPago.set(Number(cuota.monto));
  }

  cerrarPagarCuota(): void {
    this.cuotaAPagar.set(null);
  }

  confirmarPagarCuota(): void {
    const plan = this.plan();
    const cuota = this.cuotaAPagar();
    const monto = this.montoPago();
    if (!plan || !cuota || !monto || monto <= 0) return;

    this.pagando.set(true);

    this.planPagoService
      .pagarCuota(plan.id, { cuota_id: cuota.id, monto })
      .subscribe({
        next: () => {
          this.pagando.set(false);
          this.cuotaAPagar.set(null);
          this.toast.success('Cuota pagada.');
          this.cargar(plan.id);
        },
        error: (error: HttpErrorResponse) => {
          this.pagando.set(false);
          this.toast.error(
            mensajeError(error, 'No se pudo registrar el pago de la cuota.'),
          );

          if (esErrorNegocio(error, 'cuota_ya_pagada')) {
            this.cargar(plan.id);
          }
        },
      });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.error.set(false);
    this.planPagoService.obtener(id).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  protected readonly error = signal(false);
  protected readonly estado = computed(() =>
    this.cargando() ? 'cargando' : this.error() ? 'error' : 'listo',
  );
  protected readonly paginaHistorial = signal(1);
  protected readonly filasPorPagina = signal(25);
  protected readonly historial = computed(() => this.plan()?.cuotas ?? []);
  protected readonly filasHistorial = computed(() =>
    this.historial().slice(
      (this.paginaHistorial() - 1) * this.filasPorPagina(),
      this.paginaHistorial() * this.filasPorPagina(),
    ),
  );
  protected readonly metaHistorial = computed<MetaListado>(() => ({
    total: this.historial().length,
    page: this.paginaHistorial(),
    rows: this.filasPorPagina(),
    filtros_aplicados: {},
    permisos: {},
  }));
  protected readonly columnasHistorial: ColumnaListado<
    NonNullable<PlanPago['cuotas']>[number]
  >[] = [
    { tipo: 'cantidad', campo: 'numero_cuota', encabezado: '#' },
    { tipo: 'dinero', campo: 'monto', encabezado: 'Monto' },
    { tipo: 'dinero', campo: 'monto_capital', encabezado: 'Capital' },
    { tipo: 'dinero', campo: 'monto_interes', encabezado: 'Interés' },
    { tipo: 'fecha', campo: 'fecha_vencimiento', encabezado: 'Vence' },
    { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'cuota' },
    {
      tipo: 'acciones',
      acciones: (fila) =>
        fila.estado !== 'pagada'
          ? [
              {
                tipo: 'custom',
                id: 'pagar',
                descripcion: 'Pagar',
                icono: 'pi pi-dollar',
              },
            ]
          : [],
    },
  ];

  reintentar(): void {
    this.cargar(Number(this.route.snapshot.paramMap.get('id')));
  }

  cambiarPaginaHistorial(evento: CambioListado): void {
    this.paginaHistorial.set(evento.page);
    this.filasPorPagina.set(evento.rows);
  }
}
