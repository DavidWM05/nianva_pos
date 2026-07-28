import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent } from '@nucleo/ui-shared';

import { DevolucionService } from '../../devolucion.service';
import { Devolucion } from '../../devolucion.types';

/**
 * Vista de registro de una devolucion/cambio -- General (venta origen,
 * items, diferencia, pagos, link a la venta sombra si es un cambio) y
 * Auditoria (@defer, patron de siempre). Sin acciones de escritura aqui
 * (a diferencia de Venta/Apartado): el catalogo de permisos sembrado
 * solo tiene devoluciones.ver/crear, no hay "anular"/"cancelar" una
 * devolucion ya registrada.
 */
@Component({
  selector: 'nucleo-devolucion-detalle',
  standalone: true,
  imports: [DatePipe, RouterLink, RecordTabsComponent, AuditLogViewerComponent],
  templateUrl: './devolucion-detalle.component.html',
  styleUrl: './devolucion-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevolucionDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly devolucionService = inject(DevolucionService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-file' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly devolucion = signal<Devolucion | null>(null);
  protected readonly cargando = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.devolucionService.obtener(id).subscribe({
      next: (devolucion) => {
        this.devolucion.set(devolucion);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected etiquetaMetodosPago(pagos: { nombre: string | null }[] | undefined): string {
    if (!pagos || pagos.length === 0) return '—';

    return pagos.map((p) => p.nombre ?? 'Método eliminado').join(' + ');
  }

  /** Quita el signo por texto (no aritmetica) para no perder el formato "120.00". */
  protected montoAbsoluto(diferencia: string): string {
    return diferencia.startsWith('-') ? diferencia.slice(1) : diferencia;
  }
}
