import {
  BtnEnviarComponent,
  CampoComponent,
  InputDineroComponent,
} from '@nianva/ui-forms';
import { ModalComponent } from '@nianva/ui-overlays';
import { MatButton } from '@angular/material/button';
import {
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { BadgeComponent, SkeletonComponent } from '@nianva/ui-feedback';
import { DineroPipe, FechaPipe, FechaHoraPipe } from '@nianva/ui-format';
import {
  DatosComponent,
  FormActionsComponent,
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
  ConfirmDialogService,
  RecordTabConfig,
  RecordTabsComponent,
  ToastService,
  mensajeError,
} from '@nianva/ui-shared';

import { GiftCardService } from '../../gift-card.service';
import { GiftCard } from '../../gift-card.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 */
@Component({
  selector: 'nucleo-gift-card-detalle',
  standalone: true,
  imports: [
    BtnEnviarComponent,
    CampoComponent,
    InputDineroComponent,
    ModalComponent,
    FormsModule,
    RecordTabsComponent,
    AuditLogViewerComponent,
    PageComponent,
    PageHeaderComponent,
    SectionComponent,
    DatosComponent,
    FormActionsComponent,
    TablaComponent,
    BadgeComponent,
    SkeletonComponent,
    DineroPipe,
    FechaPipe,
    FechaHoraPipe,
    MatButton,
  ],
  templateUrl: './gift-card-detalle.component.html',
  styleUrl: './gift-card-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiftCardDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly giftCardService = inject(GiftCardService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Gift Card', icon: 'pi pi-credit-card' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly giftCard = signal<GiftCard | null>(null);

  protected readonly puedeRecargar = computed(() => {
    const gc = this.giftCard();
    if (!gc) return false;

    return gc.estado !== 'cancelada' && !this.estaExpirada(gc);
  });

  protected readonly puedeCancelar = computed(
    () => this.giftCard()?.estado !== 'cancelada',
  );

  // -- Recargar --
  protected readonly mostrarRecargar = signal(false);
  protected readonly montoRecarga = signal<number | null>(null);
  protected readonly recargando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  abrirRecargar(): void {
    this.montoRecarga.set(null);
    this.mostrarRecargar.set(true);
  }

  cerrarRecargar(): void {
    this.mostrarRecargar.set(false);
  }

  confirmarRecargar(): void {
    const giftCard = this.giftCard();
    const monto = this.montoRecarga();
    if (!giftCard || !monto || monto <= 0) return;

    this.recargando.set(true);

    // GiftCardController::recargar() devuelve el modelo via ->fresh(), sin
    // eager-load de `recargas` -- usar esa respuesta directamente borraria
    // el historial ya cargado. Se recarga con obtener() (mismo patron que
    // anular() y CuentaCobrarDetalleComponent) para traer `recargas` completo.
    this.giftCardService.recargar(giftCard.id, monto).subscribe({
      next: () => {
        this.recargando.set(false);
        this.mostrarRecargar.set(false);
        this.cargar(giftCard.id);
        this.toast.success('Gift card recargada.');
      },
      error: (error: HttpErrorResponse) => {
        this.recargando.set(false);
        this.toast.error(
          mensajeError(error, 'No se pudo recargar la gift card.'),
        );
      },
    });
  }

  async cancelar(): Promise<void> {
    const giftCard = this.giftCard();
    if (!giftCard) return;

    const confirmado = await this.confirmDialog.confirm({
      message: `¿Cancelar la gift card ${giftCard.codigo}? Esta acción no se puede deshacer.`,
      header: 'Cancelar gift card',
      severity: 'danger',
    });

    if (!confirmado) return;

    this.giftCardService.cancelar(giftCard.id).subscribe({
      next: () => {
        this.toast.success('Gift card cancelada.');
        this.cargar(giftCard.id);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(
          mensajeError(error, 'No se pudo cancelar la gift card.'),
        );
      },
    });
  }

  private estaExpirada(gc: GiftCard): boolean {
    return (
      gc.estado === 'expirada' ||
      (!!gc.fecha_expiracion &&
        gc.fecha_expiracion < new Date().toISOString().slice(0, 10))
    );
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.error.set(false);
    this.giftCardService.obtener(id).subscribe({
      next: (giftCard) => {
        this.giftCard.set(giftCard);
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
  protected readonly historial = computed(() =>
    (this.giftCard()?.recargas ?? []).map((fila) => ({
      ...fila,
      usuarioTexto: fila.usuario?.nombre ?? '—',
    })),
  );
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
    NonNullable<GiftCard['recargas']>[number] & { usuarioTexto: string }
  >[] = [
    { tipo: 'fechaHora', campo: 'fecha', encabezado: 'Fecha' },
    { tipo: 'dinero', campo: 'monto', encabezado: 'Monto' },
    { tipo: 'texto', campo: 'usuarioTexto', encabezado: 'Registrada por' },
  ];

  reintentar(): void {
    this.cargar(Number(this.route.snapshot.paramMap.get('id')));
  }

  cambiarPaginaHistorial(evento: CambioListado): void {
    this.paginaHistorial.set(evento.page);
    this.filasPorPagina.set(evento.rows);
  }
}
