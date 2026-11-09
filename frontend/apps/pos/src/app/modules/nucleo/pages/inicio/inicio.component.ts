import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { KpiComponent, SkeletonComponent } from '@nianva/ui-feedback';
import { DineroPipe, FechaPipe } from '@nianva/ui-format';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';

import { CajaActual } from '../../../tpv/caja.types';
import { CajaService } from '../../../tpv/caja.service';
import { ApartadoPorVencer, InicioResumen } from '../../inicio.types';
import { InicioService } from '../../inicio.service';

/**
 * Reemplaza el placeholder de "Núcleo" (ver el reporte de Fase C, punto
 * 4). Junta datos de Tpv (caja) e Inicio (ventas del dia + apartados por
 * vencer, InicioController -- cruce Tpv+Apartados documentado ahi) en
 * una sola pantalla -- inyecta CajaService de Tpv directamente (excepcion
 * de dependencia entre modulos ya establecida en el frontend, ver
 * ProductoDetalleComponent->ConfiguracionService).
 */
/**
 * Portada de Nucleo: junta caja y el resumen de ventas del dia. Inyecta
 * CajaService de Tpv directamente, una excepcion de dependencia ya
 * establecida en el frontend.
 */
@Component({
  selector: 'nucleo-inicio',
  standalone: true,
  imports: [DineroPipe, FechaPipe, KpiComponent, MatButton, PageHeaderComponent, RouterLink, SectionComponent, SkeletonComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioComponent implements OnInit {
  private readonly inicioService = inject(InicioService);
  private readonly cajaService = inject(CajaService);

  protected readonly cargandoResumen = signal(true);
  protected readonly resumen = signal<InicioResumen | null>(null);

  protected readonly cargandoCaja = signal(true);
  protected readonly caja = signal<CajaActual | null>(null);

  ngOnInit(): void {
    this.inicioService.resumen().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.cargandoResumen.set(false);
      },
      error: () => this.cargandoResumen.set(false),
    });

    this.cajaService.actual().subscribe({
      next: (caja) => {
        this.caja.set(caja);
        this.cargandoCaja.set(false);
      },
      error: () => this.cargandoCaja.set(false),
    });
  }

  protected diasParaVencer(apartado: ApartadoPorVencer): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(apartado.fecha_vencimiento);
    return Math.round((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }
}
