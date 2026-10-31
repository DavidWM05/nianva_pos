import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { ClienteFormComponent } from '../../cliente-form/cliente-form.component';
import { ClienteFormPayload, ClienteService } from '../../cliente.service';
import { Cliente, VentaResumen } from '../../cliente.types';
import { CrmAvanzadoService } from '../../crm-avanzado.service';
import { CrmInteraccion, LoyaltyResumen, TipoInteraccion } from '../../crm-avanzado.types';

const ICONO_POR_TIPO: Record<TipoInteraccion, string> = {
  llamada: '📞',
  email: '📧',
  whatsapp: '💬',
  nota: '📝',
  visita: '🚶',
};

const TIPOS_INTERACCION: { label: string; value: TipoInteraccion }[] = [
  { label: 'Llamada', value: 'llamada' },
  { label: 'Email', value: 'email' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Nota', value: 'nota' },
  { label: 'Visita', value: 'visita' },
];

/**
 * Vista de registro del modulo CRM -- General (formulario editable),
 * Historial de ventas (lectura), Interacciones y Loyalty/Puntos (extension
 * CrmAvanzado, ver el reporte), Auditoria (@defer on viewport, mismo
 * patron ya validado en el demo de scaffolding).
 *
 * Interacciones/Loyalty se cargan de una vez en ngOnInit (no al cambiar de
 * pestana) -- mismo criterio que "Historial de ventas": RecordTabsComponent
 * ya instancia todos los <ng-template> a la vez via ngTemplateOutlet, asi
 * que no hay ahorro real en diferir la carga hasta seleccionar la pestana.
 *
 * "+ Nueva Interacción" y "Ajustar Puntos" se muestran siempre (sin
 * meta.permisos que gatee estas 2 acciones -- CrmAvanzadoController no lo
 * expone hoy, a diferencia del resto de endpoints de Nucleo). Si el
 * usuario no tiene el permiso, el backend responde 403 y se muestra como
 * toast -- ver mensajeError(). No se oculta el boton con una lista de
 * roles hardcodeada (ver regla de permisos del reporte).
 */
@Component({
  selector: 'nucleo-cliente-detalle',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RecordTabsComponent,
    ClienteFormComponent,
    AuditLogViewerComponent,
    Button,
    Dialog,
    InputText,
    Select,
    Textarea,
  ],
  templateUrl: './cliente-detalle.component.html',
  styleUrl: './cliente-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clienteService = inject(ClienteService);
  private readonly crmAvanzadoService = inject(CrmAvanzadoService);
  private readonly toast = inject(ToastService);

  @ViewChild(ClienteFormComponent) private formulario?: ClienteFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-user' },
    { label: 'Historial de ventas', icon: 'pi pi-shopping-cart' },
    { label: 'Interacciones', icon: 'pi pi-comments' },
    { label: 'Loyalty / Puntos', icon: 'pi pi-star' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly tiposInteraccion = TIPOS_INTERACCION;
  protected readonly iconoPorTipo = ICONO_POR_TIPO;

  protected readonly cliente = signal<Cliente | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  protected readonly ventas = signal<VentaResumen[]>([]);
  protected readonly cargandoVentas = signal(true);

  // -- Interacciones --
  protected readonly interacciones = signal<CrmInteraccion[]>([]);
  protected readonly cargandoInteracciones = signal(true);
  protected readonly mostrarNuevaInteraccion = signal(false);
  protected readonly tipoNuevaInteraccion = signal<TipoInteraccion>('llamada');
  protected readonly observacionNuevaInteraccion = signal('');
  protected readonly guardandoInteraccion = signal(false);

  // -- Loyalty / Puntos --
  protected readonly loyalty = signal<LoyaltyResumen | null>(null);
  protected readonly cargandoLoyalty = signal(true);
  protected readonly mostrarAjustePuntos = signal(false);
  protected readonly puntosAjuste = signal<number | null>(null);
  protected readonly motivoAjuste = signal('');
  protected readonly ajustandoPuntos = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.clienteService.obtener(id).subscribe(({ cliente, permisos }) => {
      this.cliente.set(cliente);
      this.puedeEditar.set(permisos.editar);
      this.cargando.set(false);
    });

    this.clienteService.ventas(id).subscribe({
      next: (ventas) => {
        this.ventas.set(ventas);
        this.cargandoVentas.set(false);
      },
      error: () => this.cargandoVentas.set(false),
    });

    this.cargarInteracciones(id);
    this.cargarLoyalty(id);
  }

  onGuardar(payload: ClienteFormPayload): void {
    const cliente = this.cliente();
    if (!cliente) {
      return;
    }

    this.guardando.set(true);

    this.clienteService.actualizar(cliente.id, payload).subscribe({
      next: (actualizado) => {
        this.cliente.set(actualizado);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar el cliente.');
        }
      },
    });
  }

  abrirNuevaInteraccion(): void {
    this.tipoNuevaInteraccion.set('llamada');
    this.observacionNuevaInteraccion.set('');
    this.mostrarNuevaInteraccion.set(true);
  }

  cerrarNuevaInteraccion(): void {
    this.mostrarNuevaInteraccion.set(false);
  }

  guardarInteraccion(): void {
    const cliente = this.cliente();
    const observacion = this.observacionNuevaInteraccion().trim();
    if (!cliente || !observacion) return;

    this.guardandoInteraccion.set(true);

    this.crmAvanzadoService
      .crearInteraccion(cliente.id, { tipo: this.tipoNuevaInteraccion(), observacion })
      .subscribe({
        next: (interaccion) => {
          this.interacciones.update((actuales) => [interaccion, ...actuales]);
          this.guardandoInteraccion.set(false);
          this.mostrarNuevaInteraccion.set(false);
          this.toast.success('Interacción registrada.');
        },
        error: (error: HttpErrorResponse) => {
          this.guardandoInteraccion.set(false);
          this.toast.error(this.mensajeError(error, 'No se pudo registrar la interacción.'));
        },
      });
  }

  abrirAjustePuntos(): void {
    this.puntosAjuste.set(null);
    this.motivoAjuste.set('');
    this.mostrarAjustePuntos.set(true);
  }

  cerrarAjustePuntos(): void {
    this.mostrarAjustePuntos.set(false);
  }

  confirmarAjustePuntos(): void {
    const cliente = this.cliente();
    const puntos = this.puntosAjuste();
    const motivo = this.motivoAjuste().trim();
    if (!cliente || puntos === null || puntos === 0 || !motivo) return;

    this.ajustandoPuntos.set(true);

    this.crmAvanzadoService.ajustarPuntos(cliente.id, { puntos, motivo }).subscribe({
      next: () => {
        this.ajustandoPuntos.set(false);
        this.mostrarAjustePuntos.set(false);
        this.toast.success('Puntos ajustados.');
        // Vuelve a pedir el resumen completo (saldo + historial) en vez de
        // aplicar el delta localmente -- puntos_acumulados solo sube en
        // ajustes positivos (ver CrmAvanzadoService::ajustarPuntos() en el
        // backend), replicar esa regla aqui duplicaria logica de negocio
        // que ya vive del lado correcto.
        this.cargarLoyalty(cliente.id);
      },
      error: (error: HttpErrorResponse) => {
        this.ajustandoPuntos.set(false);
        this.toast.error(this.mensajeError(error, 'No se pudo ajustar los puntos.'));
      },
    });
  }

  private cargarInteracciones(clienteId: number): void {
    this.cargandoInteracciones.set(true);
    this.crmAvanzadoService.interacciones(clienteId).subscribe({
      next: (interacciones) => {
        this.interacciones.set(interacciones);
        this.cargandoInteracciones.set(false);
      },
      error: () => this.cargandoInteracciones.set(false),
    });
  }

  private cargarLoyalty(clienteId: number): void {
    this.cargandoLoyalty.set(true);
    this.crmAvanzadoService.loyalty(clienteId).subscribe({
      next: (loyalty) => {
        this.loyalty.set(loyalty);
        this.cargandoLoyalty.set(false);
      },
      error: () => this.cargandoLoyalty.set(false),
    });
  }

  /**
   * Sin `error_code` que distinguir aqui (a diferencia de ErrorNegocioTpv):
   * CrmAvanzadoService::ajustarPuntos() lanza un InvalidArgumentException
   * plano en el backend, sin mapeo a error_code en bootstrap/app.php --
   * fuera del alcance de este cambio (requiere tocar el backend). El
   * `message` sigue siendo confiable en desarrollo/staging (APP_DEBUG=true);
   * en produccion con debug apagado, Laravel devuelve un mensaje generico
   * en su lugar y este fallback es lo unico que el cajero vera.
   */
  private mensajeError(error: HttpErrorResponse, fallback: string): string {
    const cuerpo = error.error as { message?: string } | undefined;

    return cuerpo?.message ?? fallback;
  }
}
