import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent } from '@nianva/ui-shared';
import { Button } from 'primeng/button';

import { VentaService } from '../../venta.service';
import { Venta } from '../../venta.types';

/**
 * Vista de registro de Venta -- General (resumen + cliente + pago, ver el
 * reporte del punto 2: datos principales de la transaccion arriba) +
 * Lineas (sub-tab, datos secundarios) + Auditoria. Siempre de solo
 * lectura -- una venta nunca se edita, solo se anula (VentasListComponent)
 * o se devuelve (DevolucionComponent) -- por eso no hay `readonly`
 * @Input ni boton de guardar aqui, a diferencia de Producto/Cliente/
 * ReglaPrecio/Cupon.
 */
@Component({
  selector: 'nucleo-venta-detalle',
  standalone: true,
  imports: [DatePipe, RouterLink, RecordTabsComponent, StatusBadgeComponent, Button, AuditLogViewerComponent],
  templateUrl: './venta-detalle.component.html',
  styleUrl: './venta-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ventaService = inject(VentaService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-receipt' },
    { label: 'Líneas', icon: 'pi pi-list' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly venta = signal<Venta | null>(null);
  protected readonly cargando = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.ventaService.obtener(id).subscribe((venta) => {
      this.venta.set(venta);
      this.cargando.set(false);
    });
  }

  protected etiquetaMetodosPago(venta: Venta): string {
    if (!venta.metodos_pago || venta.metodos_pago.length === 0) return '—';

    return venta.metodos_pago.map((p) => p.nombre ?? 'Método eliminado').join(' + ');
  }
}
