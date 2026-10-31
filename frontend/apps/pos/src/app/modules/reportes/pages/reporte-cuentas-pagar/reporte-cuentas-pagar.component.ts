import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { CuentaPagarService } from '../../../cuentas-pagar/cuenta-pagar.service';
import { ReporteCuentasPagar } from '../../../cuentas-pagar/cuenta-pagar.types';

/**
 * Reporte de antigüedad de saldos -- solo lectura, sin paginar (top-N por
 * saldo, ver CuentaPagarService.reporte()). Mismo patrón visual de
 * "tiles" que InicioComponent / ReporteCuentasCobrarComponent.
 */
@Component({
  selector: 'nucleo-reporte-cuentas-pagar',
  standalone: true,
  imports: [],
  templateUrl: './reporte-cuentas-pagar.component.html',
  styleUrl: './reporte-cuentas-pagar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteCuentasPagarComponent implements OnInit {
  private readonly cuentaPagarService = inject(CuentaPagarService);

  protected readonly cargando = signal(true);
  protected readonly reporte = signal<ReporteCuentasPagar | null>(null);

  ngOnInit(): void {
    this.cuentaPagarService.reporte().subscribe({
      next: (reporte) => {
        this.reporte.set(reporte);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
