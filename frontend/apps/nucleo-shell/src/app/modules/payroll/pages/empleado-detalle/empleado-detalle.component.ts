import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent } from '@nucleo/ui-shared';

import { EmpleadoService } from '../../empleado.service';
import { Empleado } from '../../empleado.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Ya disponible desde que PayrollController gano empleadosShow(). Solo
 * lectura: no hay empleadosUpdate() ni una accion de desactivar.
 */
@Component({
  selector: 'nucleo-empleado-detalle',
  standalone: true,
  imports: [DatePipe, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent],
  templateUrl: './empleado-detalle.component.html',
  styleUrl: './empleado-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpleadoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly empleadoService = inject(EmpleadoService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Empleado', icon: 'pi pi-id-card' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly empleado = signal<Empleado | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargando.set(true);

    this.empleadoService.obtener(id).subscribe({
      next: (empleado) => {
        this.empleado.set(empleado);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
