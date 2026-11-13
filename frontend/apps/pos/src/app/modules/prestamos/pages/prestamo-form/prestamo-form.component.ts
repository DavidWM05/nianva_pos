import {
  CampoComponent,
  InputDineroComponent,
  BtnEnviarComponent,
} from '@nianva/ui-forms';

import { MatInput } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { PROVEEDORES_FECHA_ES_MX, fechaComoIso } from '@nianva/ui-report';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';

import { PrestamoService } from '../../prestamo.service';

/**
 * Solo "crear" -- PrestamoController no tiene update() ni show(), asi que
 * no hay modo editar ni ruta de detalle (ver el docblock de PrestamoService).
 */
@Component({
  selector: 'nucleo-prestamo-form',
  standalone: true,
  providers: PROVEEDORES_FECHA_ES_MX,
  imports: [
    FormsModule,
    RouterLink,
    CampoComponent,
    InputDineroComponent,
    BtnEnviarComponent,
    MatInput,
    MatDatepickerModule,
  ],
  templateUrl: './prestamo-form.component.html',
  styleUrl: './prestamo-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrestamoFormComponent {
  private readonly prestamoService = inject(PrestamoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly referencia = signal('');
  protected readonly monto = signal<number | null>(null);
  protected readonly interes = signal<number | null>(null);
  protected readonly fechaPrestamo = signal<Date | null>(new Date());
  protected readonly fechaVencimiento = signal<Date | null>(null);
  protected readonly notas = signal('');
  protected readonly guardando = signal(false);

  crear(): void {
    const monto = this.monto();
    const fechaPrestamo = fechaComoIso(this.fechaPrestamo());
    const fechaVencimiento = fechaComoIso(this.fechaVencimiento());
    if (!monto || monto <= 0 || !fechaPrestamo) return;

    this.guardando.set(true);

    this.prestamoService
      .crear({
        referencia: this.referencia() || null,
        monto,
        interes: this.interes() ?? 0,
        fecha_prestamo: fechaPrestamo,
        fecha_vencimiento: fechaVencimiento,
        notas: this.notas() || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toast.success('Préstamo registrado.');
          this.router.navigate(['/prestamos']);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(
            cuerpo?.message ?? 'No se pudo registrar el préstamo.',
          );
        },
      });
  }
}
