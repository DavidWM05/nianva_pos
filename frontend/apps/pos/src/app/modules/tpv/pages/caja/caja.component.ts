import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService, esErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

import { CajaService } from '../../caja.service';
import { CajaActual, CajaDesglose, CajaSesion } from '../../caja.types';
import { Gasto } from '../../gasto.types';
import { GastoService } from '../../gasto.service';

/**
 * Pantalla de caja: abrir/ver estado/cerrar la sesion de la sucursal del
 * usuario actual. No es un CRUD -- por eso no usa DataTableComponent ni
 * DynamicFormComponent, es una maquina de 3 estados (sin sesion / sesion
 * abierta / recien cerrada) que decide que mostrar segun `actual()`.
 *
 * La pantalla de Venta (ver VentaComponent) consulta este mismo estado
 * para bloquear la captura si no hay caja abierta -- ver la decision de
 * diseno completa en el reporte (punto 2 del encargo).
 *
 * Gastos (ver el reporte del modulo Gastos) vive aqui, no en una pantalla
 * propia: una seccion "Gastos de esta sesion" con lista simple + un
 * modal corto para registrar uno nuevo. Reacciona a
 * permisos.gastos_ver/gastos_crear del backend, igual que el resto de la
 * pantalla reacciona a permisos.abrir/cerrar.
 */
@Component({
  selector: 'nucleo-caja',
  standalone: true,
  imports: [FormsModule, DatePipe, Button, InputText, Dialog],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaComponent implements OnInit {
  private readonly cajaService = inject(CajaService);
  private readonly gastoService = inject(GastoService);
  private readonly toast = inject(ToastService);

  protected readonly cargando = signal(true);
  protected readonly estado = signal<CajaActual | null>(null);

  protected readonly montoApertura = signal<number | null>(null);
  protected readonly abriendo = signal(false);

  protected readonly montoFisico = signal<number | null>(null);
  protected readonly cerrando = signal(false);

  protected readonly cajaRecienCerrada = signal<CajaSesion | null>(null);
  protected readonly desgloseCierre = signal<CajaDesglose | null>(null);

  protected readonly gastos = signal<Gasto[]>([]);
  protected readonly cargandoGastos = signal(false);

  protected readonly mostrarModalGasto = signal(false);
  protected readonly descripcionGasto = signal('');
  protected readonly montoGasto = signal<number | null>(null);
  protected readonly registrandoGasto = signal(false);

  ngOnInit(): void {
    this.cargarEstado();
  }

  private cargarEstado(): void {
    this.cargando.set(true);
    this.cajaService.actual().subscribe({
      next: (estado) => {
        this.estado.set(estado);
        this.cargando.set(false);

        if (estado.sesion && estado.permisos.gastos_ver) {
          this.cargarGastos(estado.sesion.id);
        } else {
          this.gastos.set([]);
        }
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarGastos(cajaSesionId: number): void {
    this.cargandoGastos.set(true);
    this.gastoService.listar(cajaSesionId).subscribe({
      next: (gastos) => {
        this.gastos.set(gastos);
        this.cargandoGastos.set(false);
      },
      error: () => this.cargandoGastos.set(false),
    });
  }

  abrirCaja(): void {
    const monto = this.montoApertura();
    if (monto === null || monto < 0) return;

    this.abriendo.set(true);

    this.cajaService.abrir(monto).subscribe({
      next: () => {
        this.abriendo.set(false);
        this.montoApertura.set(null);
        this.toast.success('Caja abierta.');
        this.cargarEstado();
      },
      error: (error: HttpErrorResponse) => {
        this.abriendo.set(false);
        this.toast.error(mensajeError(error, 'No se pudo abrir la caja.'));
      },
    });
  }

  cerrarCaja(): void {
    const sesion = this.estado()?.sesion;
    const monto = this.montoFisico();
    if (!sesion || monto === null || monto < 0) return;

    this.cerrando.set(true);

    this.cajaService.cerrar(sesion.id, monto).subscribe({
      next: ({ sesion: cerrada, desglose }) => {
        this.cerrando.set(false);
        this.montoFisico.set(null);
        this.cajaRecienCerrada.set(cerrada);
        this.desgloseCierre.set(desglose);
        this.cargarEstado();
      },
      error: (error: HttpErrorResponse) => {
        this.cerrando.set(false);
        this.toast.error(mensajeError(error, 'No se pudo cerrar la caja.'));

        if (esErrorNegocio(error, 'caja_ya_cerrada')) {
          this.cargarEstado();
        }
      },
    });
  }

  cerrarResumenDeCierre(): void {
    this.cajaRecienCerrada.set(null);
    this.desgloseCierre.set(null);
  }

  abrirModalGasto(): void {
    this.descripcionGasto.set('');
    this.montoGasto.set(null);
    this.mostrarModalGasto.set(true);
  }

  cerrarModalGasto(): void {
    this.mostrarModalGasto.set(false);
  }

  registrarGasto(): void {
    const descripcion = this.descripcionGasto().trim();
    const monto = this.montoGasto();
    if (!descripcion || monto === null || monto <= 0) return;

    this.registrandoGasto.set(true);

    this.gastoService.registrar(descripcion, monto).subscribe({
      next: () => {
        this.registrandoGasto.set(false);
        this.mostrarModalGasto.set(false);
        this.toast.success('Gasto registrado.');
        // Refresca el resumen en vivo (total_gastos) y la lista -- un
        // solo lugar de verdad para el estado de la sesion.
        this.cargarEstado();
      },
      error: (error: HttpErrorResponse) => {
        this.registrandoGasto.set(false);
        this.toast.error(mensajeError(error, 'No se pudo registrar el gasto.'));
      },
    });
  }

}
