import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, ConfirmDialogService, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

import { GiftCardService } from '../../gift-card.service';
import { GiftCard } from '../../gift-card.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 */
@Component({
  selector: 'nucleo-gift-card-detalle',
  standalone: true,
  imports: [DatePipe, FormsModule, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent, Button, Dialog, InputText],
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

  protected readonly puedeCancelar = computed(() => this.giftCard()?.estado !== 'cancelada');

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
        this.toast.error(this.mensajeError(error, 'No se pudo recargar la gift card.'));
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
        this.toast.error(this.mensajeError(error, 'No se pudo cancelar la gift card.'));
      },
    });
  }

  private estaExpirada(gc: GiftCard): boolean {
    return gc.estado === 'expirada' || (!!gc.fecha_expiracion && gc.fecha_expiracion < new Date().toISOString().slice(0, 10));
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.giftCardService.obtener(id).subscribe({
      next: (giftCard) => {
        this.giftCard.set(giftCard);
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
