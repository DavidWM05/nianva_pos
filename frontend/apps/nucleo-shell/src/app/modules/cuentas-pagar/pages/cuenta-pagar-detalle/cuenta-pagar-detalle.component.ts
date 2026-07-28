import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, ConfirmDialogService, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { MetodoPago } from '../../../tpv/metodo-pago.types';
import { MetodoPagoService } from '../../../tpv/metodo-pago.service';
import { CuentaPagarService } from '../../cuenta-pagar.service';
import { CuentaPagar } from '../../cuenta-pagar.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Sin permisos de gating: mismo criterio que CxC/Gift Cards -- se muestran
 * las acciones siempre y el 403 real (si aplica) se ve como toast.
 * No hay link a la compra origen: no existe todavia una vista /compras/:id
 * en el frontend, asi que "compra_id" se muestra como texto plano.
 */
@Component({
  selector: 'nucleo-cuenta-pagar-detalle',
  standalone: true,
  imports: [DatePipe, FormsModule, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent, Button, Dialog, InputText, Select],
  templateUrl: './cuenta-pagar-detalle.component.html',
  styleUrl: './cuenta-pagar-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaPagarDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cuentaPagarService = inject(CuentaPagarService);
  private readonly metodoPagoService = inject(MetodoPagoService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Cuenta por pagar', icon: 'pi pi-wallet' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly cuenta = signal<CuentaPagar | null>(null);

  protected readonly puedePagar = computed(() => this.cuenta()?.estado === 'pendiente');
  protected readonly puedeAnular = computed(() => this.cuenta()?.estado === 'pendiente' && (this.cuenta()?.abonos?.length ?? 0) === 0);

  // -- Registrar pago --
  protected readonly metodosPago = signal<MetodoPago[]>([]);
  protected readonly mostrarPago = signal(false);
  protected readonly montoPago = signal<number | null>(null);
  protected readonly metodoPagoElegido = signal<number | null>(null);
  protected readonly referenciaPago = signal('');
  protected readonly pagando = signal(false);

  ngOnInit(): void {
    this.metodoPagoService.listar().subscribe((metodos) => this.metodosPago.set(metodos));

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  abrirPago(): void {
    this.montoPago.set(null);
    this.metodoPagoElegido.set(null);
    this.referenciaPago.set('');
    this.mostrarPago.set(true);
  }

  cerrarPago(): void {
    this.mostrarPago.set(false);
  }

  confirmarPago(): void {
    const cuenta = this.cuenta();
    const monto = this.montoPago();
    const metodoPagoId = this.metodoPagoElegido();
    if (!cuenta || !monto || monto <= 0 || metodoPagoId === null) return;

    this.pagando.set(true);

    this.cuentaPagarService
      .registrarPago(cuenta.id, { monto, metodo_pago_id: metodoPagoId, referencia: this.referenciaPago() || null })
      .subscribe({
        next: () => {
          this.pagando.set(false);
          this.mostrarPago.set(false);
          this.toast.success('Pago registrado.');
          this.cargar(cuenta.id);
        },
        error: (error: HttpErrorResponse) => {
          this.pagando.set(false);
          this.toast.error(this.mensajeError(error, 'No se pudo registrar el pago.'));
        },
      });
  }

  async anular(): Promise<void> {
    const cuenta = this.cuenta();
    if (!cuenta) return;

    const confirmado = await this.confirmDialog.confirm({
      message: `¿Anular esta cuenta por pagar? Esta acción no se puede deshacer.`,
      header: 'Anular cuenta por pagar',
      severity: 'danger',
    });

    if (!confirmado) return;

    this.cuentaPagarService.anular(cuenta.id).subscribe({
      next: () => {
        this.toast.success('Cuenta por pagar anulada.');
        this.cargar(cuenta.id);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(this.mensajeError(error, 'No se pudo anular la cuenta.'));
      },
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.cuentaPagarService.obtener(id).subscribe({
      next: (cuenta) => {
        this.cuenta.set(cuenta);
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
