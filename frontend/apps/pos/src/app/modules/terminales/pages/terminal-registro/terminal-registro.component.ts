import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { limitesDe } from '@nianva/api-contrato';
import { SesionActualService } from '@nianva/domain-sesion';
import { ConfirmDialogService, ToastService } from '@nianva/ui-feedback';
import { BtnEnviarComponent, CampoComponent } from '@nianva/ui-forms';
import { FormActionsComponent, PageComponent, PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { EntidadSelectorComponent, RecordTabConfig, RecordTabsComponent, mensajeError } from '@nianva/ui-shared';
import { MatButton } from '@angular/material/button';
import { finalize } from 'rxjs';

import { BUSCADOR_SUCURSAL } from '../../../../core/buscadores-entidad.tokens';
import { TerminalListadoService, type Terminal } from '@nianva/domain-nucleo';

@Component({
  selector: 'nucleo-terminal-registro',
  imports: [BtnEnviarComponent, CampoComponent, EntidadSelectorComponent, FormActionsComponent, MatButton, PageComponent, PageHeaderComponent, ReactiveFormsModule, RecordTabsComponent, SectionComponent],
  templateUrl: './terminal-registro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalRegistroComponent {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(TerminalListadoService);
  private readonly sesion = inject(SesionActualService);
  private readonly confirmar = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly buscadorSucursal = inject(BUSCADOR_SUCURSAL);
  protected readonly permiteElegirSucursal = computed(() => {
    const permisos = this.sesion.sesion()?.permisos ?? [];
    return permisos.includes('usuarios.ver') && permisos.includes('sucursales.todas');
  });
  protected readonly id = this.ruta.snapshot.paramMap.get('id');
  protected readonly registro = signal<Terminal | null>(null);
  protected readonly estado = signal<'listo' | 'cargando' | 'error'>(this.id === null ? 'listo' : 'cargando');
  protected readonly enviando = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly tabs: RecordTabConfig[] = [{ label: 'General', icon: 'pi pi-desktop' }];
  protected readonly maxNombre = limitesDe('/terminales', 'post').nombre.maxLength;
  protected readonly limite = computed(() => this.sesion.sesion()?.limites?.terminales);
  protected readonly cuotaLlena = computed(() => {
    const limite = this.limite();
    return this.id === null && limite !== undefined && limite.uso >= limite.maximo;
  });
  protected readonly activo = new FormControl(true, { nonNullable: true });
  protected readonly nombre = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(this.maxNombre)] });
  protected readonly sucursalId = linkedSignal(() => this.registro()?.sucursal_id ?? this.sesion.sesion()?.sucursal?.id ?? null);
  protected readonly nombreSucursal = computed(() => {
    const actual = this.sesion.sesion()?.sucursal;
    const id = this.sucursalId();
    return actual && id === actual.id ? actual.nombre : id === null ? 'Sin sucursal' : 'Sucursal ' + id;
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    if (this.id === null) {
      return;
    }
    this.estado.set('cargando');
    this.servicio.obtener(Number(this.id)).subscribe({
      next: (terminal) => {
        this.establecer(terminal);
        this.estado.set('listo');
      },
      error: (error: unknown) => {
        this.estado.set('error');
        this.toast.error(mensajeError(error, 'No se pudo cargar la terminal.'));
      },
    });
  }

  protected guardar(): void {
    this.nombre.markAsTouched();
    const sucursalId = this.permiteElegirSucursal()
      ? this.sucursalId()
      : this.registro()?.sucursal_id ?? this.sesion.sesion()?.sucursal?.id ?? null;
    if (this.cuotaLlena() || this.nombre.invalid || sucursalId === null || this.enviando() || this.eliminando()) {
      return;
    }

    const cuerpo = { nombre: this.nombre.value.trim(), sucursal_id: sucursalId, ...(this.activo.dirty ? { activo: this.activo.value } : {}) };
    const solicitud = this.id === null ? this.servicio.crear(cuerpo) : this.servicio.actualizar(Number(this.id), cuerpo);
    this.enviando.set(true);
    solicitud.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: (terminal) => {
        this.establecer(terminal);
        this.toast.success('Terminal guardada.');
        if (this.id === null) {
          void this.router.navigate(['/terminales', terminal.id]);
        }
      },
      error: (error: unknown) => this.toast.error(mensajeError(error, 'No se pudo guardar la terminal.')),
    });
  }

  protected async eliminar(): Promise<void> {
    const terminal = this.registro();
    if (!terminal || this.enviando() || this.eliminando()) {
      return;
    }
    this.eliminando.set(true);
    if (!await this.confirmar.confirmarEliminacion({ objeto: 'terminal', detalle: terminal.nombre })) {
      this.eliminando.set(false);
      return;
    }
    this.servicio.eliminar(terminal.id).pipe(finalize(() => this.eliminando.set(false))).subscribe({
      next: () => {
        this.toast.success('Terminal eliminada.');
        void this.router.navigate(['/terminales']);
      },
      error: (error: unknown) => this.toast.error(mensajeError(error, 'No se pudo eliminar la terminal.')),
    });
  }

  private establecer(terminal: Terminal): void {
    this.registro.set(terminal);
    this.nombre.reset(terminal.nombre);
    this.activo.reset(terminal.activo ?? true);
  }
}
