import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EntidadSelectorComponent, MENSAJE_SUCURSAL_REQUERIDA, ToastService, esErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { LineasCotizacionCambio, LineasCotizacionComponent } from '../../lineas-cotizacion/lineas-cotizacion.component';
import { Cotizacion, CotizacionFormPayload, CotizacionItemPayload } from '../../cotizacion.types';
import { CotizacionService } from '../../cotizacion.service';

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number';
}

/**
 * Un solo componente para crear y editar (ver 04_ESPECIFICACION_FRONTEND_UX.md
 * §4.2) -- se distingue por la presencia de :id en la ruta, mismo criterio
 * que el resto del flujo de venta/apartado no necesita porque ahi crear y
 * editar son pantallas distintas, pero aqui el formulario es identico salvo
 * por precargar datos existentes.
 *
 * `sucursal_id` nunca se pide en el formulario -- sale siempre del usuario
 * autenticado (mismo criterio que VentaController/ApartadoController), a
 * pesar de que CotizacionController::store() lo acepta como campo del
 * request (ver el reporte de validacion de backend: ahi es un hueco de
 * autoridad que el backend deberia cerrar resolviendolo el mismo, no algo
 * que el frontend deba explotar).
 */
@Component({
  selector: 'nucleo-cotizacion-form',
  standalone: true,
  imports: [FormsModule, RouterLink, EntidadSelectorComponent, LineasCotizacionComponent, Button, InputText, Textarea],
  templateUrl: './cotizacion-form.component.html',
  styleUrl: './cotizacion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizacionFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cotizacionService = inject(CotizacionService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);

  protected readonly cotizacionId = signal<number | null>(null);
  protected readonly editando = computed(() => this.cotizacionId() !== null);
  protected readonly cargando = signal(false);
  protected readonly cotizacionActual = signal<Cotizacion | null>(null);

  protected readonly clienteId = signal<number | null>(null);
  protected readonly validezDias = signal(15);
  protected readonly descuentoGlobal = signal(0);
  protected readonly usoCfdi = signal('');
  protected readonly observaciones = signal('');
  protected readonly precioManual = signal(false);

  protected readonly items = signal<CotizacionItemPayload[]>([]);
  protected readonly subtotal = signal(0);
  protected readonly total = computed(() => Math.max(0, Math.round((this.subtotal() - this.descuentoGlobal()) * 100) / 100));

  protected readonly guardando = signal(false);

  ngOnInit(): void {
    const permisos$ = this.cotizacionService.permisos?.();
    permisos$?.subscribe((permisos) => this.precioManual.set(permisos.precio_manual ?? false));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    const id = Number(idParam);
    this.cotizacionId.set(id);
    this.cargando.set(true);

    this.cotizacionService.obtener(id).subscribe({
      next: (cotizacion) => {
        this.cotizacionActual.set(cotizacion);
        this.clienteId.set(cotizacion.cliente?.id ?? null);
        this.validezDias.set(cotizacion.validez_dias);
        this.descuentoGlobal.set(Number(cotizacion.descuento));
        this.usoCfdi.set(cotizacion.uso_cfdi ?? '');
        this.observaciones.set(cotizacion.observaciones ?? '');
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la cotización.');
      },
    });
  }

  onLineasCambio(cambio: LineasCotizacionCambio): void {
    this.items.set(cambio.items);
    this.subtotal.set(cambio.subtotal);
  }

  guardar(): void {
    if (this.items().length === 0) {
      this.toast.warn('Agrega al menos un producto a la cotización.');

      return;
    }

    const payload: CotizacionFormPayload = {
      cliente_id: this.clienteId(),
      validez_dias: this.validezDias(),
      descuento: this.descuentoGlobal(),
      uso_cfdi: this.usoCfdi().trim() || null,
      observaciones: this.observaciones().trim() || null,
      items: this.items(),
    };

    const id = this.cotizacionId();

    let operacion;
    if (id) {
      operacion = this.cotizacionService.actualizar(id, payload);
    } else {
      const sucursalId = this.authState.usuario()?.sucursal_id;
      if (!esNumero(sucursalId)) {
        this.toast.error('No se pudo determinar tu sucursal. Vuelve a iniciar sesión.');

        return;
      }
      operacion = this.cotizacionService.crear({ ...payload, sucursal_id: sucursalId });
    }

    this.guardando.set(true);

    operacion.subscribe({
      next: (cotizacion) => {
        this.guardando.set(false);
        this.toast.success(id ? 'Cotización actualizada.' : 'Cotización creada.');
        this.router.navigate(['/cotizaciones', cotizacion.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.toast.error(
          esErrorNegocio(error, 'sucursal_requerida')
            ? MENSAJE_SUCURSAL_REQUERIDA
            : mensajeError(error, 'No se pudo guardar la cotización.'),
        );
      },
    });
  }

}
