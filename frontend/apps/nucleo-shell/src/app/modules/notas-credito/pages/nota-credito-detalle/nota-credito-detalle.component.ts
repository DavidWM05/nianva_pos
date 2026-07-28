import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent } from '@nucleo/ui-shared';

import { NotaCreditoService } from '../../nota-credito.service';
import { NotaCredito } from '../../nota-credito.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Solo lectura: no hay acciones, ver el docblock de NotaCreditoService.
 */
@Component({
  selector: 'nucleo-nota-credito-detalle',
  standalone: true,
  imports: [DatePipe, RouterLink, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent],
  templateUrl: './nota-credito-detalle.component.html',
  styleUrl: './nota-credito-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotaCreditoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly notaCreditoService = inject(NotaCreditoService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Nota de Crédito', icon: 'pi pi-ticket' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly notaCredito = signal<NotaCredito | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargando.set(true);

    this.notaCreditoService.obtener(id).subscribe({
      next: (nota) => {
        this.notaCredito.set(nota);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
