import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuditLogViewerComponent, ConfirmDialogService, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService, mensajeError } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { MetodoPago } from '../../../tpv/metodo-pago.types';
import { MetodoPagoService } from '../../../tpv/metodo-pago.service';
import { CuentaCobrarService } from '../../cuenta-cobrar.service';
import { CuentaCobrar } from '../../cuenta-cobrar.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Sin permisos de gating: mismo criterio que Gift Cards -- se muestran las
 * acciones siempre y el 403 real (si aplica) se ve como toast.
 */
@Component({
  selector: 'nucleo-cuenta-cobrar-detalle',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent, Button, Dialog, InputText, Select],
  templateUrl: './cuenta-cobrar-detalle.component.html',
  styleUrl: './cuenta-cobrar-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaCobrarDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cuentaCobrarService = inject(CuentaCobrarService);
  private readonly metodoPagoService = inject(MetodoPagoService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Cuenta por cobrar', icon: 'pi pi-wallet' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly cuenta = signal<CuentaCobrar | null>(null);

  protected readonly puedeAbonar = computed(() => this.cuenta()?.estado === 'pendiente');
  protected readonly puedeAnular = computed(() => this.cuenta()?.estado === 'pendiente' && (this.cuenta()?.abonos?.length ?? 0) === 0);

  // -- Registrar abono --
  protected readonly metodosPago = signal<MetodoPago[]>([]);
  protected readonly mostrarAbono = signal(false);
  protected readonly montoAbono = signal<number | null>(null);
  protected readonly metodoPagoElegido = signal<number | null>(null);
  protected readonly referenciaAbono = signal('');
  protected readonly abonando = signal(false);

  ngOnInit(): void {
    this.metodoPagoService.listar().subscribe((metodos) => this.metodosPago.set(metodos));

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  abrirAbono(): void {
    this.montoAbono.set(null);
    this.metodoPagoElegido.set(null);
    this.referenciaAbono.set('');
    this.mostrarAbono.set(true);
  }

  cerrarAbono(): void {
    this.mostrarAbono.set(false);
  }

  confirmarAbono(): void {
    const cuenta = this.cuenta();
    const monto = this.montoAbono();
    const metodoPagoId = this.metodoPagoElegido();
    if (!cuenta || !monto || monto <= 0 || metodoPagoId === null) return;

    this.abonando.set(true);

    this.cuentaCobrarService
      .registrarAbono(cuenta.id, { monto, metodo_pago_id: metodoPagoId, referencia: this.referenciaAbono() || null })
      .subscribe({
        next: () => {
          this.abonando.set(false);
          this.mostrarAbono.set(false);
          this.toast.success('Abono registrado.');
          this.cargar(cuenta.id);
        },
        error: (error: HttpErrorResponse) => {
          this.abonando.set(false);
          this.toast.error(mensajeError(error, 'No se pudo registrar el abono.'));
        },
      });
  }

  async anular(): Promise<void> {
    const cuenta = this.cuenta();
    if (!cuenta) return;

    const confirmado = await this.confirmDialog.confirm({
      message: `¿Anular esta cuenta por cobrar? Esta acción no se puede deshacer.`,
      header: 'Anular cuenta por cobrar',
      severity: 'danger',
    });

    if (!confirmado) return;

    this.cuentaCobrarService.anular(cuenta.id).subscribe({
      next: () => {
        this.toast.success('Cuenta por cobrar anulada.');
        this.cargar(cuenta.id);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(mensajeError(error, 'No se pudo anular la cuenta.'));
      },
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.cuentaCobrarService.obtener(id).subscribe({
      next: (cuenta) => {
        this.cuenta.set(cuenta);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

}
