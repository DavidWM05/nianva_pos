import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, inject, signal } from '@angular/core';
import { BadgeComponent, SkeletonComponent } from '@nianva/ui-feedback';
import { FechaHoraPipe } from '@nianva/ui-format';

import { AuditLogEntry, AuditLogSource } from './audit-log-viewer.types';

/**
 * Pestana de auditoria montable en cualquier vista de registro (ver
 * RecordTabsComponent del shell). Pide los datos por si sola (via
 * AuditLogSource, inyectado -- ver audit-log-viewer.types.ts) apenas se
 * instancia: al vivir detras de un @defer (on viewport) en el consumidor,
 * eso ya basta para que la carga de datos, no solo la del codigo, espere
 * a que el usuario realmente vea la pestana.
 */
@Component({
  selector: 'nucleo-audit-log-viewer',
  standalone: true,
  imports: [BadgeComponent, CommonModule, FechaHoraPipe, SkeletonComponent],
  templateUrl: './audit-log-viewer.component.html',
  styleUrl: './audit-log-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogViewerComponent implements OnChanges {
  private readonly source = inject(AuditLogSource);

  @Input({ required: true }) tabla!: string;
  /** DAT-08: el ulid publicado en documentos; el id en catálogos. */
  @Input({ required: true }) registroId!: number | string;

  protected readonly loading = signal(false);
  protected readonly entries = signal<AuditLogEntry[]>([]);
  protected readonly sinPermiso = signal(false);

  ngOnChanges(): void {
    this.loading.set(true);
    this.sinPermiso.set(false);

    this.source.listar(this.tabla, this.registroId).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: (error: { status?: number }) => {
        this.sinPermiso.set(error?.status === 403);
        this.loading.set(false);
      },
    });
  }
}
