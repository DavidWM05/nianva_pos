import { ChangeDetectionStrategy, Component, Injector, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthApiService, SesionActualService } from '@nianva/domain-sesion';
import { SkeletonComponent, ToastService } from '@nianva/ui-feedback';
import { BtnEnviarComponent, CampoComponent } from '@nianva/ui-forms';
import { mensajeError } from '@nianva/ui-shared';
import { MatButton } from '@angular/material/button';
import { finalize, switchMap } from 'rxjs';

import { TerminalListadoService, type Terminal } from '@nianva/domain-nucleo';

@Component({
  selector: 'nucleo-terminal-de-sesion',
  imports: [BtnEnviarComponent, CampoComponent, MatButton, ReactiveFormsModule, SkeletonComponent],
  templateUrl: './terminal-de-sesion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalDeSesionComponent {
  private readonly injector = inject(Injector);
  private readonly sesionActual = inject(SesionActualService);
  private readonly toast = inject(ToastService);

  protected readonly actual = computed(() => this.sesionActual.sesion()?.terminal ?? null);
  private readonly puedeAdministrar = computed(() => this.sesionActual.visible('terminales.administrar'));
  protected readonly puedeElegir = computed(() => this.sesionActual.sesion() !== null
    && (this.puedeAdministrar() || this.sesionActual.visible('caja.ver')));
  protected readonly sucursal = computed(() => this.puedeElegir() ? this.sesionActual.sesion()?.sucursal?.id ?? null : null);
  protected readonly terminales = signal<Terminal[]>([]);
  protected readonly terminalId = new FormControl<number | null>(null);
  protected readonly seleccion = toSignal(this.terminalId.valueChanges, { initialValue: null });
  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly fallo = signal<string | null>(null);
  private readonly reintentos = signal(0);

  constructor() {
    effect((limpiar) => {
      const sucursal = this.sucursal();
      this.reintentos();
      this.terminales.set([]);
      this.fallo.set(null);
      if (sucursal === null) {
        this.cargando.set(false);
        return;
      }
      this.cargando.set(true);
      const listado = this.injector.get(TerminalListadoService);
      const terminales = this.puedeAdministrar() ? listado.listarDeSucursal(sucursal) : listado.listarDeSesion();
      const consulta = terminales.pipe(finalize(() => this.cargando.set(false))).subscribe({
        next: (terminales) => this.terminales.set(terminales),
        error: (error: unknown) => this.fallo.set(mensajeError(error, 'No se pudieron cargar las terminales.')),
      });
      limpiar(() => consulta.unsubscribe());
    });
    effect(() => this.terminalId.reset(this.actual()?.id ?? null));
  }

  protected reintentar(): void {
    this.reintentos.update((intentos) => intentos + 1);
  }

  protected guardar(): void {
    const terminalId = this.terminalId.value;
    if (!this.puedeElegir() || this.cargando() || this.enviando() || terminalId === this.actual()?.id
      || terminalId === null || !this.terminales().some(({ id }) => id === terminalId)) {
      return;
    }
    this.enviando.set(true);
    const api = this.injector.get(AuthApiService);
    api.elegirTerminal(terminalId).pipe(
      switchMap(() => api.obtenerSesion()),
      finalize(() => this.enviando.set(false)),
    ).subscribe({
      next: (sesion) => {
        this.sesionActual.establecer(sesion);
        this.toast.success('Terminal de sesión actualizada.');
      },
      error: (error: unknown) => this.toast.error(mensajeError(error, 'No se pudo cambiar la terminal de la sesión.')),
    });
  }
}
