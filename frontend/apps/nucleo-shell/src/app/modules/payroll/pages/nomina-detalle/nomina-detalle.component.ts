import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';

import { NominaService } from '../../nomina.service';
import { Nomina } from '../../nomina.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Ya disponible desde que PayrollController gano nominasShow().
 */
@Component({
  selector: 'nucleo-nomina-detalle',
  standalone: true,
  imports: [DatePipe, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent, Button],
  templateUrl: './nomina-detalle.component.html',
  styleUrl: './nomina-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly nominaService = inject(NominaService);
  private readonly toast = inject(ToastService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Nómina', icon: 'pi pi-wallet' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly nomina = signal<Nomina | null>(null);
  protected readonly pagando = signal(false);

  protected readonly puedePagar = computed(() => this.nomina()?.estado === 'calculada');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  pagar(): void {
    const nomina = this.nomina();
    if (!nomina) return;

    this.pagando.set(true);

    this.nominaService.pagar(nomina.id).subscribe({
      next: () => {
        this.pagando.set(false);
        this.toast.success('Nómina pagada.');
        this.cargar(nomina.id);
      },
      error: (error: HttpErrorResponse) => {
        this.pagando.set(false);
        const cuerpo = error.error as { message?: string } | undefined;
        this.toast.error(cuerpo?.message ?? 'No se pudo pagar la nómina.');
      },
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.nominaService.obtener(id).subscribe({
      next: (nomina) => {
        this.nomina.set(nomina);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
