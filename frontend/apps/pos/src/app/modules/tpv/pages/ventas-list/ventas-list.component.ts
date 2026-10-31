import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Subject, debounceTime } from 'rxjs';

import { Venta, VentasPermisos } from '../../venta.types';
import { VentaService } from '../../venta.service';

const PERMISOS_VACIOS: VentasPermisos = { anular: false };

/**
 * Sin creacion/edicion aqui -- registrar una venta pasa por la pantalla
 * de captura (ver VentaComponent), esta lista solo consulta lo ya
 * registrado. "Ver detalle" navega a /tpv/ventas/:id (vista dedicada, ver
 * VentaDetalleComponent) -- ya no es un modal (ver el reporte del punto
 * 1). "Anular" SIGUE siendo un dialogo aqui, a proposito: no es un
 * formulario CRUD de la entidad (una venta no se "edita", solo cambia de
 * estado), es una accion puntual de una fila que pide un motivo en texto
 * -- por eso no reutiliza ConfirmDialogService (que solo soporta si/no) y
 * tiene su propio dialogo con textarea, igual que "Desactivar" en otras
 * listas usa su propio confirm().
 */
@Component({
  selector: 'nucleo-ventas-list',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    DataTableComponent,
    DataTableCellDirective,
    StatusBadgeComponent,
    Button,
    InputText,
    Dialog,
    Textarea,
  ],
  templateUrl: './ventas-list.component.html',
  styleUrl: './ventas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasListComponent {
  private readonly ventaService = inject(VentaService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'cliente', header: 'Cliente' },
    { field: 'total', header: 'Total', sortable: true },
    { field: 'metodos_pago', header: 'Pago' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha', header: 'Fecha', sortable: true },
    { field: 'acciones', header: '' },
  ];

  protected readonly ventas = signal<Venta[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<VentasPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  protected readonly ventaEnAnulacion = signal<Venta | null>(null);
  protected readonly motivoAnulacion = signal('');
  protected readonly anulando = signal(false);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.ventaService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.ventas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected etiquetaMetodosPago(venta: Venta): string {
    if (!venta.metodos_pago || venta.metodos_pago.length === 0) return '—';

    return venta.metodos_pago.map((p) => p.nombre ?? 'Método eliminado').join(' + ');
  }

  irADetalle(venta: Venta): void {
    this.router.navigate(['/tpv/ventas', venta.id]);
  }

  abrirAnulacion(venta: Venta): void {
    this.motivoAnulacion.set('');
    this.ventaEnAnulacion.set(venta);
  }

  cerrarAnulacion(): void {
    this.ventaEnAnulacion.set(null);
  }

  confirmarAnulacion(): void {
    const venta = this.ventaEnAnulacion();
    const motivo = this.motivoAnulacion().trim();
    if (!venta || !motivo) return;

    this.anulando.set(true);

    this.ventaService.anular(venta.id, motivo).subscribe({
      next: () => {
        this.anulando.set(false);
        this.ventaEnAnulacion.set(null);
        this.toast.success('Venta anulada.');
        this.cargar(this.ultimoEvento);
      },
      error: () => {
        this.anulando.set(false);
        this.toast.error('No se pudo anular la venta.');
      },
    });
  }
}
