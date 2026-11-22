import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { BtnEnviarComponent, CampoComponent, } from '@nianva/ui-forms';
import { DineroPipe, } from '@nianva/ui-format';
import { FormActionsComponent, PageComponent, PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EntidadSelectorComponent, ToastService } from '@nianva/ui-shared';
import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { ErrorNegocioTpv } from '../../../tpv/tpv-error.types';
import { LineasProductoCambio, LineasProductoComponent } from '../../../tpv/lineas-producto/lineas-producto.component';
import { ApartadoItemPayload, ApartadoService } from '@nianva/domain-apartados';
import { IntentoOperacion } from '../../../../core/operaciones/intento-operacion';


/**
 * Creacion de apartado -- mismo tratamiento de pantalla completa que la
 * venta de TPV (no un modal), y reutiliza literalmente
 * LineasProductoComponent (ver el reporte, punto 2): el carrito con
 * cotizacion real es identico al de una venta, la unica diferencia es
 * que aqui no hay cupon ni pago -- un apartado se crea sin cobrar nada,
 * los abonos se registran despues desde la vista de registro.
 */
@Component({
  selector: 'nucleo-apartado-form',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [FormsModule,RouterLink,EntidadSelectorComponent,LineasProductoComponent,MatDatepickerModule,MatInput,BtnEnviarComponent,CampoComponent,DineroPipe,FormActionsComponent,PageComponent,PageHeaderComponent,SectionComponent,],
  templateUrl: './apartado-form.component.html',
  styleUrl: './apartado-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApartadoFormComponent {
  private readonly apartadoService = inject(ApartadoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);
  // API-07: una llave por operacion; se conserva si el envio falla y se renueva al confirmar.
  private readonly intentoApartado = new IntentoOperacion();

  protected readonly clienteId = signal<string | null>(null);
  protected readonly itemsActuales = signal<ApartadoItemPayload[]>([]);
  protected readonly subtotal = signal(0);
  protected readonly fechaVencimiento = signal<Date | null>(null);
  protected readonly notas = signal('');

  protected readonly guardando = signal(false);

  onLineasCambio(cambio: LineasProductoCambio): void {
    this.itemsActuales.set(cambio.items);
    this.subtotal.set(cambio.subtotal);
  }

  crearApartado(): void {
    const clienteId = this.clienteId();
    if (clienteId === null || this.itemsActuales().length === 0) return;

    this.guardando.set(true);

    const fecha = this.fechaVencimiento();

    const apartado = {
      cliente_id: clienteId,
      items: this.itemsActuales(),
      fecha_vencimiento: fecha ? fecha.toISOString().slice(0, 10) : null,
      notas: this.notas().trim() || null,
    };

    this.intentoApartado
      .ejecutar(apartado, (llave) => this.apartadoService.crear(apartado, llave))
      .subscribe({
        next: (apartado) => {
          this.guardando.set(false);
          this.toast.success('Apartado creado.');
          this.router.navigate(['/apartados', apartado.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as ErrorNegocioTpv | undefined;
          this.toast.error(cuerpo?.message ?? 'No se pudo crear el apartado.');
        },
      });
  }
}
