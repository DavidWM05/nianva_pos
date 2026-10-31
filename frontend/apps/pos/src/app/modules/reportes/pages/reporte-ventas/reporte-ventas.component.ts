import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { SucursalService, SucursalSimple } from '../../../administracion/sucursal.service';
import { VentaService } from '../../../tpv/venta.service';
import { ReporteVentas } from '../../../tpv/venta.types';

/** Reporte de solo lectura, con filtros de fecha/sucursal (ver VentaService.reporte()). */
@Component({
  selector: 'nucleo-reporte-ventas',
  standalone: true,
  imports: [FormsModule, Button, InputText, Select],
  templateUrl: './reporte-ventas.component.html',
  styleUrl: './reporte-ventas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteVentasComponent implements OnInit {
  private readonly ventaService = inject(VentaService);
  private readonly sucursalService = inject(SucursalService);

  protected readonly cargando = signal(true);
  protected readonly reporte = signal<ReporteVentas | null>(null);
  protected readonly sucursales = signal<SucursalSimple[]>([]);

  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');
  protected readonly sucursalId = signal<number | null>(null);

  ngOnInit(): void {
    this.sucursalService.listar().subscribe((sucursales) => this.sucursales.set(sucursales));
    this.cargar();
  }

  filtrar(): void {
    this.cargar();
  }

  limpiarFiltros(): void {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.sucursalId.set(null);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);

    this.ventaService
      .reporte({
        fechaDesde: this.fechaDesde() || null,
        fechaHasta: this.fechaHasta() || null,
        sucursalId: this.sucursalId(),
      })
      .subscribe({
        next: (reporte) => {
          this.reporte.set(reporte);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }
}
