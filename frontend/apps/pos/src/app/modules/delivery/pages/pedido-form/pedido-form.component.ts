import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EntidadSelectorComponent, ToastService } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { LineasCotizacionCambio, LineasCotizacionComponent } from '../../../cotizaciones/lineas-cotizacion/lineas-cotizacion.component';
import { PedidoService } from '../../pedido.service';
import { PedidoItemPayload } from '../../pedido.types';

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number';
}

/**
 * Solo "crear" -- PedidoController no tiene update(). `sucursal_id` nunca
 * se pide en el formulario -- sale del usuario autenticado, mismo criterio
 * que CotizacionFormComponent (PedidoController::store() lo acepta como
 * campo del request, hueco de autoridad que el frontend no explota).
 *
 * Reutiliza LineasCotizacionComponent (Cotizaciones) para los items: igual
 * que ahi, PedidoService::crear() nunca resuelve precio_unitario via
 * PrecioService -- lo manda el frontend tal cual, con VentaService.cotizar()
 * solo como sugerencia inicial. El campo `descuento` que emite se ignora
 * (Pedidos no lo tiene).
 */
@Component({
  selector: 'nucleo-pedido-form',
  standalone: true,
  imports: [FormsModule, RouterLink, EntidadSelectorComponent, LineasCotizacionComponent, Button, InputText, Textarea],
  templateUrl: './pedido-form.component.html',
  styleUrl: './pedido-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoFormComponent {
  private readonly pedidoService = inject(PedidoService);
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);

  protected readonly clienteId = signal<number | null>(null);
  protected readonly direccionEntrega = signal('');
  protected readonly referencia = signal('');
  protected readonly costoDelivery = signal<number | null>(null);
  protected readonly tiempoEstimado = signal<number | null>(null);
  protected readonly notas = signal('');

  protected readonly items = signal<PedidoItemPayload[]>([]);

  protected readonly guardando = signal(false);

  onLineasCambio(cambio: LineasCotizacionCambio): void {
    this.items.set(cambio.items.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario })));
  }

  crear(): void {
    const clienteId = this.clienteId();
    if (clienteId === null) {
      this.toast.warn('Selecciona un cliente para continuar.');

      return;
    }

    const sucursalId = this.authState.usuario()?.sucursal_id;
    if (!esNumero(sucursalId)) {
      this.toast.error('No se pudo determinar tu sucursal. Vuelve a iniciar sesión.');

      return;
    }

    this.guardando.set(true);

    this.pedidoService
      .crear({
        cliente_id: clienteId,
        sucursal_id: sucursalId,
        direccion_entrega: this.direccionEntrega().trim() || null,
        referencia: this.referencia().trim() || null,
        costo_delivery: this.costoDelivery() ?? 0,
        tiempo_estimado: this.tiempoEstimado(),
        notas: this.notas().trim() || null,
        items: this.items().length > 0 ? this.items() : undefined,
      })
      .subscribe({
        next: (pedido) => {
          this.guardando.set(false);
          this.toast.success(`Pedido ${pedido.numero_pedido} creado.`);
          this.router.navigate(['/pedidos', pedido.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(cuerpo?.message ?? 'No se pudo crear el pedido.');
        },
      });
  }
}
