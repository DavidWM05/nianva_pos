import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EntidadSelectorComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { GiftCardService } from '../../gift-card.service';

/**
 * Solo "emitir" (POST /api/gift-cards) -- GiftCardController no tiene
 * update(), asi que no hay modo editar para esta pantalla.
 */
@Component({
  selector: 'nucleo-gift-card-form',
  standalone: true,
  imports: [FormsModule, RouterLink, EntidadSelectorComponent, Button, DatePicker, InputText],
  templateUrl: './gift-card-form.component.html',
  styleUrl: './gift-card-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiftCardFormComponent {
  private readonly giftCardService = inject(GiftCardService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);

  protected readonly clienteId = signal<number | null>(null);
  protected readonly monto = signal<number | null>(null);
  protected readonly fechaExpiracion = signal<Date | null>(null);
  protected readonly guardando = signal(false);

  emitir(): void {
    const monto = this.monto();
    if (!monto || monto <= 0) return;

    const fechaExpiracion = this.fechaExpiracion();

    this.guardando.set(true);

    this.giftCardService
      .emitir({
        cliente_id: this.clienteId(),
        monto,
        fecha_expiracion: fechaExpiracion ? fechaExpiracion.toISOString().slice(0, 10) : null,
      })
      .subscribe({
        next: (giftCard) => {
          this.guardando.set(false);
          this.toast.success(`Gift card ${giftCard.codigo} emitida.`);
          this.router.navigate(['/gift-cards', giftCard.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(cuerpo?.message ?? 'No se pudo emitir la gift card.');
        },
      });
  }
}
