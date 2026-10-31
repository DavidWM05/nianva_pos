import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EntidadSelectorComponent, ToastService } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { BUSCADOR_VENTA } from '../../../../core/buscadores-entidad.tokens';
import { PlanPagoService } from '../../plan-pago.service';
import { Periodicidad } from '../../plan-pago.types';

const PERIODICIDADES: { label: string; value: Periodicidad }[] = [
  { label: 'Mensual', value: 'mensual' },
  { label: 'Quincenal', value: 'quincenal' },
  { label: 'Semanal', value: 'semanal' },
];

/** Solo alta -- PlanPagoController no tiene update()/destroy(). */
@Component({
  selector: 'nucleo-plan-pago-form',
  standalone: true,
  imports: [FormsModule, RouterLink, EntidadSelectorComponent, Button, InputText, Select],
  templateUrl: './plan-pago-form.component.html',
  styleUrl: './plan-pago-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanPagoFormComponent {
  private readonly planPagoService = inject(PlanPagoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly buscadorVenta = inject(BUSCADOR_VENTA);
  protected readonly periodicidades = PERIODICIDADES;

  protected readonly ventaId = signal<number | null>(null);
  protected readonly numeroCuotas = signal<number | null>(6);
  protected readonly tasaInteres = signal<number | null>(null);
  protected readonly periodicidad = signal<Periodicidad>('mensual');
  protected readonly fechaInicio = signal('');
  protected readonly guardando = signal(false);

  crear(): void {
    const ventaId = this.ventaId();
    const numeroCuotas = this.numeroCuotas();
    if (ventaId === null || !numeroCuotas || numeroCuotas < 2) {
      this.toast.warn('Selecciona una venta y un número de cuotas válido (mínimo 2).');

      return;
    }

    this.guardando.set(true);

    this.planPagoService
      .crearPlan(ventaId, {
        numero_cuotas: numeroCuotas,
        tasa_interes: this.tasaInteres() ?? undefined,
        periodicidad: this.periodicidad(),
        fecha_inicio: this.fechaInicio() || null,
      })
      .subscribe({
        next: (plan) => {
          this.guardando.set(false);
          this.toast.success('Plan de pago a plazos creado.');
          this.router.navigate(['/ventas-plazos', plan.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(cuerpo?.message ?? 'No se pudo crear el plan de pago.');
        },
      });
  }
}
