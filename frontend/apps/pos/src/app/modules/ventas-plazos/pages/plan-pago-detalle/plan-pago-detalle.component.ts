import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService, esErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

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
  imports: [DatePipe, FormsModule, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent, Button, Dialog, InputText],
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

    this.planPagoService.pagarCuota(plan.id, { cuota_id: cuota.id, monto }).subscribe({
      next: () => {
        this.pagando.set(false);
        this.cuotaAPagar.set(null);
        this.toast.success('Cuota pagada.');
        this.cargar(plan.id);
      },
      error: (error: HttpErrorResponse) => {
        this.pagando.set(false);
        this.toast.error(mensajeError(error, 'No se pudo registrar el pago de la cuota.'));

        if (esErrorNegocio(error, 'cuota_ya_pagada')) {
          this.cargar(plan.id);
        }
      },
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.planPagoService.obtener(id).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
