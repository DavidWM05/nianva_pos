import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuditLogViewerComponent, ConfirmDialogService, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';

import { MetodoPago } from '../../../tpv/metodo-pago.types';
import { MetodoPagoService } from '../../../tpv/metodo-pago.service';
import { CotizacionService } from '../../cotizacion.service';
import { Cotizacion } from '../../cotizacion.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio para toda entidad
 * raiz -- ver CLAUDE.md §4). "Venta vinculada" y "Convertir a venta" solo
 * aplican segun estado -- no hay meta.permisos en la respuesta real de
 * CotizacionController (ver el reporte de validacion de backend), asi que
 * los botones de accion se muestran siempre que el ESTADO lo permita
 * (pendiente/no vencida), no segun un permiso que el backend no manda
 * hoy -- si el usuario no tiene el permiso real, el backend responde 403
 * y se ve como toast.
 */
@Component({
  selector: 'nucleo-cotizacion-detalle',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    RecordTabsComponent,
    AuditLogViewerComponent,
    StatusBadgeComponent,
    Button,
    Dialog,
    Select,
  ],
  templateUrl: './cotizacion-detalle.component.html',
  styleUrl: './cotizacion-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizacionDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cotizacionService = inject(CotizacionService);
  private readonly metodoPagoService = inject(MetodoPagoService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Cotización', icon: 'pi pi-file' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly cotizacion = signal<Cotizacion | null>(null);

  protected readonly puedeConvertir = computed(() => {
    const c = this.cotizacion();
    if (!c) return false;

    const noVencida = !c.fecha_vencimiento || c.fecha_vencimiento >= new Date().toISOString().slice(0, 10);

    return c.estado === 'pendiente' && noVencida && c.cliente !== null;
  });

  protected readonly puedeAnular = computed(() => this.cotizacion()?.estado === 'pendiente');
  protected readonly puedeEditar = computed(() => this.cotizacion()?.estado === 'pendiente');

  // -- Convertir a venta --
  protected readonly metodosPago = signal<MetodoPago[]>([]);
  protected readonly mostrarConvertir = signal(false);
  protected readonly metodoPagoElegido = signal<number | null>(null);
  protected readonly convirtiendo = signal(false);

  ngOnInit(): void {
    this.metodoPagoService.listar().subscribe((metodos) => this.metodosPago.set(metodos));

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  abrirConvertir(): void {
    this.metodoPagoElegido.set(null);
    this.mostrarConvertir.set(true);
  }

  cerrarConvertir(): void {
    this.mostrarConvertir.set(false);
  }

  confirmarConvertir(): void {
    const cotizacion = this.cotizacion();
    const metodoPagoId = this.metodoPagoElegido();
    if (!cotizacion || metodoPagoId === null) return;

    this.convirtiendo.set(true);

    this.cotizacionService.convertir(cotizacion.id, metodoPagoId).subscribe({
      next: ({ ventaId }) => {
        this.convirtiendo.set(false);
        this.mostrarConvertir.set(false);
        this.toast.success('Cotización convertida a venta.');
        this.router.navigate(['/tpv/ventas', ventaId]);
      },
      error: (error: HttpErrorResponse) => {
        this.convirtiendo.set(false);
        this.toast.error(this.mensajeError(error, 'No se pudo convertir la cotización.'));
      },
    });
  }

  async anular(): Promise<void> {
    const cotizacion = this.cotizacion();
    if (!cotizacion) return;

    const confirmado = await this.confirmDialog.confirm({
      message: `¿Anular la cotización ${cotizacion.numero_cotizacion}? Esta acción no se puede deshacer.`,
      header: 'Anular cotización',
      severity: 'danger',
    });

    if (!confirmado) return;

    this.cotizacionService.anular(cotizacion.id).subscribe({
      next: () => {
        this.toast.success('Cotización anulada.');
        this.cargar(cotizacion.id);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(this.mensajeError(error, 'No se pudo anular la cotización.'));
      },
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.cotizacionService.obtener(id).subscribe({
      next: (cotizacion) => {
        this.cotizacion.set(cotizacion);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  private mensajeError(error: HttpErrorResponse, fallback: string): string {
    const cuerpo = error.error as { message?: string } | undefined;

    return cuerpo?.message ?? fallback;
  }
}
