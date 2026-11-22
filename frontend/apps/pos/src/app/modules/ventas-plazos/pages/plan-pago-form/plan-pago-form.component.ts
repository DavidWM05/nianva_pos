import { MatButton } from '@angular/material/button';
import {
  BtnEnviarComponent,
  CampoComponent,
  SelectFiltroComponent,
} from '@nianva/ui-forms';
import {
  FormActionsComponent,
  PageComponent,
  PageHeaderComponent,
  SectionComponent,
} from '@nianva/ui-layout';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  EntidadSelectorComponent,
  ToastService,
  esErrorNegocio,
  leerErrorNegocio,
  mensajeError,
} from '@nianva/ui-shared';

import { BUSCADOR_VENTA } from '../../../../core/buscadores-entidad.tokens';
import { Periodicidad, PlanPagoService } from '@nianva/domain-ventas-plazos';
import { IntentoOperacion } from '../../../../core/operaciones/intento-operacion';

const PERIODICIDADES: { label: string; value: Periodicidad }[] = [
  { label: 'Mensual', value: 'mensual' },
  { label: 'Quincenal', value: 'quincenal' },
  { label: 'Semanal', value: 'semanal' },
];

/** Solo alta -- PlanPagoController no tiene update()/destroy(). */
@Component({
  selector: 'nucleo-plan-pago-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    EntidadSelectorComponent,
    MatButton,
    BtnEnviarComponent,
    CampoComponent,
    SelectFiltroComponent,
    FormActionsComponent,
    PageComponent,
    PageHeaderComponent,
    SectionComponent,
  ],
  templateUrl: './plan-pago-form.component.html',
  styleUrl: './plan-pago-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanPagoFormComponent {
  private readonly planPagoService = inject(PlanPagoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly buscadorVenta = inject(BUSCADOR_VENTA);
  // API-07: una llave por operacion; se conserva si el envio falla y se renueva al confirmar.
  private readonly intentoPlan = new IntentoOperacion();
  protected readonly periodicidades = PERIODICIDADES;

  // DAT-08: ulid de la venta elegida.
  protected readonly ventaId = signal<string | null>(null);
  protected readonly numeroCuotas = signal<number | null>(6);
  protected readonly tasaInteres = signal<number | null>(null);
  protected readonly periodicidad = signal<Periodicidad>('mensual');
  protected readonly fechaInicio = signal('');
  protected readonly guardando = signal(false);

  crear(): void {
    const ventaId = this.ventaId();
    const numeroCuotas = this.numeroCuotas();
    if (ventaId === null || !numeroCuotas || numeroCuotas < 2) {
      this.toast.warn(
        'Selecciona una venta y un número de cuotas válido (mínimo 2).',
      );

      return;
    }

    this.guardando.set(true);

    const plan = {
      numero_cuotas: numeroCuotas,
      tasa_interes: this.tasaInteres() ?? undefined,
      periodicidad: this.periodicidad(),
      fecha_inicio: this.fechaInicio() || null,
    };

    this.intentoPlan
      .ejecutar({ venta: ventaId, ...plan }, (llave) => this.planPagoService.crearPlan(ventaId, plan, llave))
      .subscribe({
        next: (plan) => {
          this.guardando.set(false);
          this.toast.success('Plan de pago a plazos creado.');
          this.router.navigate(['/ventas-plazos', plan.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toast.error(
            mensajeError(error, 'No se pudo crear el plan de pago.'),
          );

          if (esErrorNegocio(error, 'plan_pago_ya_activo')) {
            const planPagoId =
              leerErrorNegocio(error)?.contexto['plan_pago_id'];

            if (typeof planPagoId === 'number') {
              this.router.navigate(['/ventas-plazos', planPagoId]);
            }
          }
        },
      });
  }
}
