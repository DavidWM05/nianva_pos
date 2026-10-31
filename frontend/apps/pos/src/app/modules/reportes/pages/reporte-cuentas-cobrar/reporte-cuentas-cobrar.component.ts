import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { CuentaCobrarService } from '../../../cuentas-cobrar/cuenta-cobrar.service';
import { ReporteCuentasCobrar } from '../../../cuentas-cobrar/cuenta-cobrar.types';

/**
 * Reporte de antigüedad de saldos -- solo lectura, sin paginar (top-N por
 * saldo, ver CuentaCobrarService.reporte()). Mismo patrón visual de
 * "tiles" que InicioComponent.
 */
@Component({
  selector: 'nucleo-reporte-cuentas-cobrar',
  standalone: true,
  imports: [],
  templateUrl: './reporte-cuentas-cobrar.component.html',
  styleUrl: './reporte-cuentas-cobrar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteCuentasCobrarComponent implements OnInit {
  private readonly cuentaCobrarService = inject(CuentaCobrarService);

  protected readonly cargando = signal(true);
  protected readonly reporte = signal<ReporteCuentasCobrar | null>(null);

  ngOnInit(): void {
    this.cuentaCobrarService.reporte().subscribe({
      next: (reporte) => {
        this.reporte.set(reporte);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
