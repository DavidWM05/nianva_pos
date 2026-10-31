import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  StatusBadgeComponent,
  ToastService,
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { NominaService, NominasPermisos } from '../../nomina.service';
import { Nomina } from '../../nomina.types';

const PERMISOS_VACIOS: NominasPermisos = { crear: false };

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number';
}

/** "Ver" navega a /payroll/nominas/:id -- "Pagar" vive ahi (ver NominaDetalleComponent), no aqui. */
@Component({
  selector: 'nucleo-nominas-list',
  standalone: true,
  imports: [DatePipe, FormsModule, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, DatePicker, Dialog],
  templateUrl: './nominas-list.component.html',
  styleUrl: './nominas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominasListComponent {
  private readonly nominaService = inject(NominaService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly columns: DataTableColumn[] = [
    { field: 'periodo', header: 'Periodo' },
    { field: 'total_percepciones', header: 'Percepciones' },
    { field: 'total_deducciones', header: 'Deducciones' },
    { field: 'total_neto', header: 'Neto' },
    { field: 'estado', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly nominas = signal<Nomina[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<NominasPermisos>(PERMISOS_VACIOS);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };

  // -- Generar nomina --
  protected readonly mostrarGenerar = signal(false);
  protected readonly periodoInicio = signal<Date | null>(null);
  protected readonly periodoFin = signal<Date | null>(null);
  protected readonly generando = signal(false);

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(nomina: Nomina): void {
    this.router.navigate(['/payroll/nominas', nomina.id]);
  }

  abrirGenerar(): void {
    this.periodoInicio.set(null);
    this.periodoFin.set(null);
    this.mostrarGenerar.set(true);
  }

  cerrarGenerar(): void {
    this.mostrarGenerar.set(false);
  }

  confirmarGenerar(): void {
    const inicio = this.periodoInicio();
    const fin = this.periodoFin();
    if (!inicio || !fin) return;

    const sucursalId = this.authState.usuario()?.sucursal_id;
    if (!esNumero(sucursalId)) {
      this.toast.error('No se pudo determinar tu sucursal. Vuelve a iniciar sesión.');

      return;
    }

    this.generando.set(true);

    this.nominaService
      .generar({
        sucursal_id: sucursalId,
        periodo_inicio: inicio.toISOString().slice(0, 10),
        periodo_fin: fin.toISOString().slice(0, 10),
      })
      .subscribe({
        next: () => {
          this.generando.set(false);
          this.mostrarGenerar.set(false);
          this.toast.success('Nómina generada.');
          this.cargar(this.ultimoEvento);
        },
        error: (error: HttpErrorResponse) => {
          this.generando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(cuerpo?.message ?? 'No se pudo generar la nómina.');
        },
      });
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.nominaService.listar(evento).subscribe({
      next: (respuesta) => {
        this.nominas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
