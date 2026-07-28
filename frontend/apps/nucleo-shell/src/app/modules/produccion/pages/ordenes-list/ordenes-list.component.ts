import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfirmDialogService,
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  EntidadSelectorComponent,
  StatusBadgeComponent,
  ToastService,
} from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { BUSCADOR_RECETA } from '../../../../core/buscadores-entidad.tokens';
import { OrdenProduccionService, OrdenesPermisos } from '../../orden.service';
import { OrdenProduccion } from '../../orden.types';

const PERMISOS_VACIOS: OrdenesPermisos = { crear: false };

/**
 * Sin ordenesShow() -- alta en dialogo sobre la misma lista (como
 * Insumos) y transiciones de estado como acciones de fila, ya que no hay
 * pantalla de detalle propia.
 */
@Component({
  selector: 'nucleo-ordenes-list',
  standalone: true,
  imports: [
    FormsModule,
    DataTableComponent,
    DataTableCellDirective,
    EntidadSelectorComponent,
    StatusBadgeComponent,
    Button,
    Dialog,
    InputText,
    Textarea,
  ],
  templateUrl: './ordenes-list.component.html',
  styleUrl: './ordenes-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdenesListComponent {
  private readonly ordenService = inject(OrdenProduccionService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly buscadorReceta = inject(BUSCADOR_RECETA);

  protected readonly columns: DataTableColumn[] = [
    { field: 'receta', header: 'Receta' },
    { field: 'cantidad_programada', header: 'Programada' },
    { field: 'cantidad_producida', header: 'Producida' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha_programada', header: 'Fecha programada' },
    { field: 'acciones', header: '' },
  ];

  protected readonly ordenes = signal<OrdenProduccion[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<OrdenesPermisos>(PERMISOS_VACIOS);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };

  // -- Nueva orden --
  protected readonly mostrarFormulario = signal(false);
  protected readonly recetaId = signal<number | null>(null);
  protected readonly cantidadProgramada = signal<number | null>(null);
  protected readonly fechaProgramada = signal('');
  protected readonly notas = signal('');
  protected readonly guardando = signal(false);

  // -- Completar orden --
  protected readonly ordenACompletar = signal<OrdenProduccion | null>(null);
  protected readonly cantidadProducida = signal<number | null>(null);
  protected readonly completando = signal(false);

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  abrirFormulario(): void {
    this.recetaId.set(null);
    this.cantidadProgramada.set(null);
    this.fechaProgramada.set('');
    this.notas.set('');
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  guardar(): void {
    const recetaId = this.recetaId();
    const cantidad = this.cantidadProgramada();
    if (recetaId === null || !cantidad || cantidad <= 0) return;

    this.guardando.set(true);

    this.ordenService
      .crear({
        receta_id: recetaId,
        cantidad_programada: cantidad,
        fecha_programada: this.fechaProgramada() || null,
        notas: this.notas().trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarFormulario.set(false);
          this.toast.success('Orden de producción creada.');
          this.cargar(this.ultimoEvento);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toast.error(this.mensajeError(error, 'No se pudo crear la orden de producción.'));
        },
      });
  }

  async iniciar(orden: OrdenProduccion): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Marcar la orden #${orden.id} como en proceso?`,
      header: 'Iniciar orden',
      severity: 'info',
    });
    if (!confirmado) return;

    this.cambiarEstado(orden, 'en_proceso');
  }

  async cancelar(orden: OrdenProduccion): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Cancelar la orden #${orden.id}? Esta acción no se puede deshacer.`,
      header: 'Cancelar orden',
      severity: 'danger',
    });
    if (!confirmado) return;

    this.cambiarEstado(orden, 'cancelada');
  }

  abrirCompletar(orden: OrdenProduccion): void {
    this.ordenACompletar.set(orden);
    this.cantidadProducida.set(orden.cantidad_programada);
  }

  cerrarCompletar(): void {
    this.ordenACompletar.set(null);
  }

  confirmarCompletar(): void {
    const orden = this.ordenACompletar();
    const cantidad = this.cantidadProducida();
    if (!orden || !cantidad || cantidad <= 0) return;

    this.completando.set(true);

    this.ordenService.cambiarEstado(orden.id, 'completada', cantidad).subscribe({
      next: () => {
        this.completando.set(false);
        this.ordenACompletar.set(null);
        this.toast.success('Orden completada. Stock de insumos descontado y stock de producto actualizado.');
        this.cargar(this.ultimoEvento);
      },
      error: (error: HttpErrorResponse) => {
        this.completando.set(false);
        this.toast.error(this.mensajeError(error, 'No se pudo completar la orden.'));
      },
    });
  }

  private cambiarEstado(orden: OrdenProduccion, estado: 'en_proceso' | 'cancelada'): void {
    this.ordenService.cambiarEstado(orden.id, estado).subscribe({
      next: () => {
        this.toast.success('Estado actualizado.');
        this.cargar(this.ultimoEvento);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(this.mensajeError(error, 'No se pudo actualizar el estado.'));
      },
    });
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.ordenService.listar(evento).subscribe({
      next: (respuesta) => {
        this.ordenes.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private mensajeError(error: HttpErrorResponse, fallback: string): string {
    const cuerpo = error.error as { message?: string } | undefined;

    return cuerpo?.message ?? fallback;
  }
}
