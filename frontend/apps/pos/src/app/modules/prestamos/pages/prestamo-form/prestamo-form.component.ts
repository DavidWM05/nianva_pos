import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { PrestamoService } from '../../prestamo.service';

/**
 * Solo "crear" -- PrestamoController no tiene update() ni show(), asi que
 * no hay modo editar ni ruta de detalle (ver el docblock de PrestamoService).
 */
@Component({
  selector: 'nucleo-prestamo-form',
  standalone: true,
  imports: [FormsModule, RouterLink, Button, DatePicker, InputText, Textarea],
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
    const fechaPrestamo = this.fechaPrestamo();
    const fechaVencimiento = this.fechaVencimiento();
    if (!monto || monto <= 0 || !fechaPrestamo) return;

    this.guardando.set(true);

    this.prestamoService
      .crear({
        referencia: this.referencia() || null,
        monto,
        interes: this.interes() ?? 0,
        fecha_prestamo: fechaPrestamo.toISOString().slice(0, 10),
        fecha_vencimiento: fechaVencimiento ? fechaVencimiento.toISOString().slice(0, 10) : null,
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
          this.toast.error(cuerpo?.message ?? 'No se pudo registrar el préstamo.');
        },
      });
  }
}
