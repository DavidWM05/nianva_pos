import { ChangeDetectionStrategy, Component, afterNextRender, computed, effect, inject, Injector, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { AuthApiService } from '@nianva/domain-sesion';
import { BtnEnviarComponent, CampoComponent, InputPinComponent, SelectFiltroComponent } from '@nianva/ui-forms';
import { FormActionsComponent } from '@nianva/ui-layout';
import { ModalComponent } from '@nianva/ui-overlays';
import { esErrorNegocio, mensajeError } from '@nianva/ui-shared';

import { AutorizacionSupervisorService, PeticionSupervisor } from './autorizacion-supervisor.service';

/**
 * Dialogo de autorizacion de supervisor (SEG-05). Montado una sola vez en la raiz, como el de
 * confirmacion: lo abre AutorizacionSupervisorService cuando el servidor pide supervisor. Elige al
 * supervisor, pide su PIN (ui-input-pin, el mismo del bloqueo de SEG-12) y pide el token para el
 * cuerpo exacto de la operacion. Al cerrar, ui-modal devuelve el foco a donde estaba.
 */
@Component({
  selector: 'nucleo-autorizacion-supervisor-host',
  standalone: true,
  imports: [BtnEnviarComponent, CampoComponent, FormActionsComponent, FormsModule, InputPinComponent, MatButton, ModalComponent, SelectFiltroComponent],
  template: `
    <ui-modal titulo="Autorización de supervisor" [visible]="peticion() !== null" (visibleChange)="$event || cancelar()">
      @if (peticion(); as peticion) {
        <form (ngSubmit)="autorizar(peticion)">
          <p>{{ peticion.solicitud.descripcion }} requiere la autorización de un supervisor.</p>
          <ui-campo etiqueta="Supervisor">
            <ui-select-filtro
              name="supervisor"
              [todas]="false"
              [opciones]="opciones()"
              [ngModel]="supervisorId()"
              (ngModelChange)="supervisorId.set($event)"
            />
          </ui-campo>
          <ui-campo etiqueta="PIN del supervisor">
            <ui-input-pin name="pin" [longitud]="6" [ngModel]="pin()" (ngModelChange)="pin.set($event)" />
          </ui-campo>
          <p role="alert">{{ aviso() }}</p>
          <ui-form-actions>
            <button matButton="outlined" type="button" (click)="cancelar()">Cancelar</button>
            <!-- Sin deshabilitar por el largo del PIN: un Enter justo tras el ultimo digito debe enviar. -->
            <ui-btn-enviar etiqueta="Autorizar" [enviando]="enviando()" [deshabilitado]="bloqueado()" />
          </ui-form-actions>
        </form>
      }
    </ui-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutorizacionSupervisorHostComponent {
  private readonly servicio = inject(AutorizacionSupervisorService);
  private readonly api = inject(AuthApiService);
  private readonly injector = inject(Injector);
  private readonly entradaPin = viewChild(InputPinComponent);

  protected readonly peticion = this.servicio.pendiente;
  /** null mientras se cargan. */
  protected readonly supervisores = signal<{ id: number; nombre: string }[] | null>(null);
  protected readonly supervisorId = signal<number | null>(null);
  protected readonly pin = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly agotado = signal(false);
  protected readonly enviando = signal(false);

  protected readonly opciones = computed(() => (this.supervisores() ?? []).map((supervisor) => ({ label: supervisor.nombre, value: supervisor.id })));
  protected readonly aviso = computed(() =>
    this.supervisores()?.length === 0 ? 'No hay supervisores que puedan autorizar esta operación.' : (this.error() ?? ''),
  );
  /** Sin supervisores o con los intentos agotados no hay a quien pedir: el boton se apaga. */
  protected readonly bloqueado = computed(() => this.supervisores()?.length === 0 || this.agotado());

  constructor() {
    effect(() => {
      const peticion = this.peticion();
      if (peticion) {
        untracked(() => this.preparar(peticion));
      }
    });
  }

  protected autorizar(peticion: PeticionSupervisor): void {
    const supervisorId = this.supervisorId();
    if (this.bloqueado() || this.enviando()) {
      return;
    }
    if (supervisorId === null) {
      this.error.set('Elige al supervisor que autoriza.');
      return;
    }
    if (this.pin().length < 4) {
      this.error.set('Escribe el PIN del supervisor: de 4 a 6 dígitos.');
      this.enfocarPin();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.api
      .solicitarAutorizacionSupervisor({
        supervisor_id: supervisorId,
        pin: this.pin(),
        accion: peticion.solicitud.accion,
        recurso: peticion.solicitud.recurso ?? null,
        datos: peticion.solicitud.datos,
      })
      .subscribe({
        next: (autorizacion) => {
          this.enviando.set(false);
          peticion.resolver(autorizacion.token);
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          this.pin.set('');
          if (esErrorNegocio(error, 'supervisor_intentos_agotados')) {
            this.agotado.set(true);
            this.error.set('Se agotaron los intentos de autorización. Espera unos minutos e intenta de nuevo.');
          } else if (esErrorNegocio(error, 'supervisor_invalido')) {
            this.error.set('El supervisor o el PIN no son válidos.');
          } else {
            this.error.set(mensajeError(error, 'No se pudo autorizar la operación.'));
          }
          this.enfocarPin();
        },
      });
  }

  protected cancelar(): void {
    this.peticion()?.resolver(null);
  }

  private preparar(peticion: PeticionSupervisor): void {
    this.supervisores.set(null);
    this.supervisorId.set(null);
    this.pin.set('');
    this.error.set(null);
    this.agotado.set(false);
    this.enviando.set(false);
    // GET /supervisores: los del tenant y la sucursal del documento con permiso para la accion.
    this.api.listarSupervisores(peticion.solicitud.accion, peticion.solicitud.recurso).subscribe({
      next: (lista) => {
        this.supervisores.set(lista);
        if (lista.length === 1) {
          this.supervisorId.set(lista[0].id);
          this.enfocarPin();
        }
      },
      error: () => this.supervisores.set([]),
    });
  }

  private enfocarPin(): void {
    afterNextRender(() => this.entradaPin()?.focus(), { injector: this.injector });
  }
}
