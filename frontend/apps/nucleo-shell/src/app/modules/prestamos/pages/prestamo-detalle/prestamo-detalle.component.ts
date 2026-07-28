import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

import { PrestamoService } from '../../prestamo.service';
import { Prestamo } from '../../prestamo.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Ya disponible desde que PrestamoController gano show() -- antes de eso
 * "Ver pagos" vivia como un dialogo en la lista (ver git history de
 * PrestamosListComponent).
 */
@Component({
  selector: 'nucleo-prestamo-detalle',
  standalone: true,
  imports: [DatePipe, FormsModule, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent, Button, Dialog, InputText],
  templateUrl: './prestamo-detalle.component.html',
  styleUrl: './prestamo-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrestamoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly prestamoService = inject(PrestamoService);
  private readonly toast = inject(ToastService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Préstamo', icon: 'pi pi-percentage' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly prestamo = signal<Prestamo | null>(null);

  protected readonly puedePagar = computed(() => this.prestamo()?.estado === 'activo');

  // -- Registrar pago --
  protected readonly mostrarRegistrarPago = signal(false);
  protected readonly montoPago = signal<number | null>(null);
  protected readonly pagando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  abrirRegistrarPago(): void {
    this.montoPago.set(null);
    this.mostrarRegistrarPago.set(true);
  }

  cerrarRegistrarPago(): void {
    this.mostrarRegistrarPago.set(false);
  }

  confirmarRegistrarPago(): void {
    const prestamo = this.prestamo();
    const monto = this.montoPago();
    if (!prestamo || !monto || monto <= 0) return;

    this.pagando.set(true);

    this.prestamoService.registrarPago(prestamo.id, { monto }).subscribe({
      next: () => {
        this.pagando.set(false);
        this.mostrarRegistrarPago.set(false);
        this.toast.success('Pago registrado.');
        this.cargar(prestamo.id);
      },
      error: (error: HttpErrorResponse) => {
        this.pagando.set(false);
        const cuerpo = error.error as { message?: string } | undefined;
        this.toast.error(cuerpo?.message ?? 'No se pudo registrar el pago.');
      },
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.prestamoService.obtener(id).subscribe({
      next: (prestamo) => {
        this.prestamo.set(prestamo);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
